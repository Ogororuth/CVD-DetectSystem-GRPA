import torch
import torch.nn.functional as F
from transformers import ViTForImageClassification, ViTImageProcessor, ViTConfig
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import cv2
from pathlib import Path
import time
import os
from django.conf import settings
from .model_loader import ModelDownloader


class RealWorldECGAnalyzer:
    @staticmethod
    def crop_ecg_grid(image, bottom_cut_ratio=0.78, padding_ratio=0.02):
        if not isinstance(image, Image.Image):
            raise TypeError("Expected PIL Image")
        img = np.array(image)
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY) if len(img.shape) == 3 else img
        h, w = gray.shape
        _, thresh = cv2.threshold(gray, 230, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            cut_h = int(h * bottom_cut_ratio)
            return image.crop((0, 0, w, cut_h)), (0, 0, w, cut_h)
        largest = max(contours, key=cv2.contourArea)
        x, y, bw, bh = cv2.boundingRect(largest)
        pad_x, pad_y = int(bw * padding_ratio), int(bh * padding_ratio)
        x, y = max(0, x - pad_x), max(0, y - pad_y)
        x2, y2 = min(w, x + bw + 2 * pad_x), min(h, y + int(bh * 1.3))
        return image.crop((x, y, x2, y2)), (x, y, x2, y2)

    @staticmethod
    def get_lead_boxes(image_width, image_height):
        """Lead positions for standard 12-lead ECG (4x3 grid)"""
        boxes = {
            'I':   (0.00, 0.13, 0.25, 0.30),
            'aVR': (0.25, 0.13, 0.50, 0.30),
            'V1':  (0.50, 0.13, 0.75, 0.30),
            'V4':  (0.75, 0.13, 1.00, 0.30),
            'II':  (0.00, 0.33, 0.25, 0.50),
            'aVL': (0.25, 0.33, 0.50, 0.50),
            'V2':  (0.50, 0.33, 0.75, 0.50),
            'V5':  (0.75, 0.33, 1.00, 0.50),
            'III': (0.00, 0.53, 0.25, 0.70),
            'aVF': (0.25, 0.53, 0.50, 0.70),
            'V3':  (0.50, 0.53, 0.75, 0.70),
            'V6':  (0.75, 0.53, 1.00, 0.70),
        }
        return {lead: (int(l*image_width), int(t*image_height), int(r*image_width), int(b*image_height))
                for lead, (l,t,r,b) in boxes.items()}


class MultiMethodInterpreter:
    """Three-method interpretability without heatmaps"""
    
    LEAD_INFO = {
        'I': {'territory': 'lateral', 'artery': 'LCX'},
        'II': {'territory': 'inferior', 'artery': 'RCA'},
        'III': {'territory': 'inferior', 'artery': 'RCA'},
        'aVR': {'territory': 'cavity', 'artery': 'LMCA'},
        'aVL': {'territory': 'lateral', 'artery': 'LCX'},
        'aVF': {'territory': 'inferior', 'artery': 'RCA'},
        'V1': {'territory': 'septal', 'artery': 'LAD'},
        'V2': {'territory': 'septal', 'artery': 'LAD'},
        'V3': {'territory': 'anterior', 'artery': 'LAD'},
        'V4': {'territory': 'anterior', 'artery': 'LAD'},
        'V5': {'territory': 'lateral', 'artery': 'LCX'},
        'V6': {'territory': 'lateral', 'artery': 'LCX'},
    }

    @classmethod
    def attention_rollout(cls, model, pixel_values):
        """Method 1: Attention Rollout - returns per-patch attention"""
        with torch.no_grad():
            outputs = model.vit(pixel_values, output_attentions=True)
        
        attentions = outputs.attentions
        device = pixel_values.device
        rollout = torch.eye(attentions[0].shape[-1]).to(device)
        
        for attention in attentions:
            attn_mean = attention.mean(dim=1)[0]
            attn_mean = attn_mean + torch.eye(attn_mean.shape[0]).to(device)
            attn_mean = attn_mean / attn_mean.sum(dim=-1, keepdim=True)
            rollout = torch.matmul(rollout, attn_mean)
        
        cls_attn = rollout[0, 1:].cpu().numpy()
        size = int(np.sqrt(len(cls_attn)))
        return cls_attn.reshape(size, size)

    @classmethod
    def integrated_gradients(cls, model, pixel_values, target_class, steps=30):
        """Method 2: Integrated Gradients"""
        model.eval()
        baseline = torch.zeros_like(pixel_values)
        
        scaled_inputs = [baseline + (float(i) / steps) * (pixel_values - baseline) 
                        for i in range(steps + 1)]
        
        total_gradients = torch.zeros_like(pixel_values)
        
        for scaled_input in scaled_inputs:
            scaled_input = scaled_input.clone().requires_grad_(True)
            output = model(scaled_input)
            score = output.logits[0, target_class]
            model.zero_grad()
            score.backward()
            total_gradients += scaled_input.grad
        
        avg_gradients = total_gradients / steps
        integrated_grad = (pixel_values - baseline) * avg_gradients
        attribution = integrated_grad.sum(dim=1).squeeze().cpu().detach().numpy()
        attribution = np.abs(attribution)
        
        if attribution.max() > 0:
            attribution = attribution / attribution.max()
        
        return attribution

    @classmethod
    def ablation_study(cls, model, processor, original_image, lead_boxes, baseline_probs, target_class, device):
        """Method 3: Ablation Study"""
        ablation_results = {}
        baseline_conf = float(baseline_probs[target_class])
        img_array = np.array(original_image)
        
        for lead, (x1, y1, x2, y2) in lead_boxes.items():
            masked_img = img_array.copy()
            masked_img[y1:y2, x1:x2] = [255, 240, 240]
            
            masked_pil = Image.fromarray(masked_img.astype(np.uint8))
            inputs = processor(images=masked_pil, return_tensors="pt")
            pixel_values = inputs['pixel_values'].to(device)
            
            with torch.no_grad():
                outputs = model(pixel_values)
                probs = F.softmax(outputs.logits, dim=1)[0]
            
            masked_conf = float(probs[target_class])
            confidence_drop = baseline_conf - masked_conf
            drop_percentage = (confidence_drop / baseline_conf) * 100 if baseline_conf > 0 else 0
            
            ablation_results[lead] = {
                'original_confidence': round(baseline_conf * 100, 1),
                'masked_confidence': round(masked_conf * 100, 1),
                'confidence_drop': round(confidence_drop * 100, 1),
                'drop_percentage': round(drop_percentage, 1)
            }
        
        return ablation_results

    @classmethod
    def compute_lead_scores(cls, attention_map, ig_map, lead_boxes, image_size):
        """Compute per-lead scores from attention and gradients"""
        h, w = image_size
        attn_resized = cv2.resize(attention_map, (w, h))
        ig_resized = cv2.resize(ig_map, (w, h))
        
        if attn_resized.max() > attn_resized.min():
            attn_resized = (attn_resized - attn_resized.min()) / (attn_resized.max() - attn_resized.min())
        if ig_resized.max() > ig_resized.min():
            ig_resized = (ig_resized - ig_resized.min()) / (ig_resized.max() - ig_resized.min())
        
        lead_scores = {}
        for lead, (x1, y1, x2, y2) in lead_boxes.items():
            attn_region = attn_resized[y1:y2, x1:x2]
            ig_region = ig_resized[y1:y2, x1:x2]
            
            lead_scores[lead] = {
                'attention_score': float(np.mean(attn_region)) if attn_region.size > 0 else 0,
                'gradient_score': float(np.mean(ig_region)) if ig_region.size > 0 else 0,
            }
        
        return lead_scores

    @classmethod
    def calculate_consensus(cls, lead_scores, ablation_results):
        """Calculate consensus across all three methods"""
        attn_ranked = sorted(lead_scores.keys(), key=lambda x: lead_scores[x]['attention_score'], reverse=True)
        grad_ranked = sorted(lead_scores.keys(), key=lambda x: lead_scores[x]['gradient_score'], reverse=True)
        ablation_ranked = sorted(ablation_results.keys(), key=lambda x: ablation_results[x]['confidence_drop'], reverse=True)
        
        consensus = {}
        for lead in lead_scores.keys():
            attn_rank = attn_ranked.index(lead)
            grad_rank = grad_ranked.index(lead)
            ablation_rank = ablation_ranked.index(lead)
            
            in_top_3 = sum([attn_rank < 3, grad_rank < 3, ablation_rank < 3])
            in_top_5 = sum([attn_rank < 5, grad_rank < 5, ablation_rank < 5])
            
            if in_top_3 == 3:
                level = 'critical'
                stars = 3
            elif in_top_3 >= 2:
                level = 'important'
                stars = 2
            elif in_top_5 >= 2:
                level = 'moderate'
                stars = 1
            else:
                level = 'minor'
                stars = 0
            
            consensus[lead] = {
                'level': level,
                'stars': stars,
                'attn_rank': attn_rank + 1,
                'grad_rank': grad_rank + 1,
                'ablation_rank': ablation_rank + 1
            }
        
        top_3_attn = set(attn_ranked[:3])
        top_3_grad = set(grad_ranked[:3])
        top_3_ablation = set(ablation_ranked[:3])
        
        common_top_3 = top_3_attn & top_3_grad & top_3_ablation
        pairwise_agreement = len(top_3_attn & top_3_grad) + len(top_3_grad & top_3_ablation) + len(top_3_attn & top_3_ablation)
        
        overall_score = min(100, len(common_top_3) * 33.3 + pairwise_agreement * 5)
        
        if len(common_top_3) >= 2:
            overall_level = 'HIGH'
        elif len(common_top_3) >= 1 or pairwise_agreement >= 4:
            overall_level = 'MODERATE'
        else:
            overall_level = 'LOW'
        
        return consensus, {
            'score': round(overall_score, 1),
            'level': overall_level,
            'common_critical_leads': list(common_top_3),
            'top_leads_by_method': {
                'attention': attn_ranked[:3],
                'gradient': grad_ranked[:3],
                'ablation': ablation_ranked[:3]
            }
        }

    @classmethod
    def generate_lead_grid_image(cls, original_image, lead_analysis, consensus):
        """Generate clean lead grid overlay showing scores (no heatmap)"""
        img = original_image.copy()
        draw = ImageDraw.Draw(img)
        
        # Try to load a font, fall back to default
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
        except:
            font = ImageFont.load_default()
            font_small = font
        
        lead_boxes = RealWorldECGAnalyzer.get_lead_boxes(img.width, img.height)
        
        for lead, (x1, y1, x2, y2) in lead_boxes.items():
            data = lead_analysis.get(lead, {})
            cons = consensus.get(lead, {})
            
            level = cons.get('level', 'minor')
            score = data.get('attention_score', 0)
            
            # Color based on consensus level
            if level == 'critical':
                box_color = (220, 38, 38)  # Red
                fill_color = (254, 226, 226, 100)  # Light red
            elif level == 'important':
                box_color = (217, 119, 6)  # Amber
                fill_color = (254, 243, 199, 100)  # Light amber
            elif level == 'moderate':
                box_color = (107, 114, 128)  # Gray
                fill_color = (243, 244, 246, 80)  # Light gray
            else:
                box_color = (209, 213, 219)  # Light gray
                fill_color = None
            
            # Draw box outline
            draw.rectangle([x1, y1, x2, y2], outline=box_color, width=2)
            
            # Draw lead name and score
            label = f"{lead}"
            score_text = f"{score*100:.0f}%"
            
            # Background for text
            draw.rectangle([x1+2, y1+2, x1+50, y1+20], fill=(255, 255, 255, 200))
            draw.text((x1+5, y1+3), label, fill=box_color, font=font)
            draw.text((x1+30, y1+4), score_text, fill=(75, 85, 99), font=font_small)
            
            # Add star for critical leads
            if level == 'critical':
                draw.text((x2-20, y1+3), "★", fill=(220, 38, 38), font=font)
            elif level == 'important':
                draw.text((x2-20, y1+3), "●", fill=(217, 119, 6), font=font)
        
        return img


class ECGPredictor:
    CLASS_NAMES = ['MI_History', 'MI_Patient', 'Normal']
    RISK_MAPPING = {'MI_Patient': 'high', 'MI_History': 'moderate', 'Normal': 'low'}
    
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize_model()
        return cls._instance

    def _initialize_model(self):
        print("Loading ECG ViT model...")
        downloader = ModelDownloader()
        model_path = downloader.get_model_path()

        self._device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        checkpoint = torch.load(model_path, map_location=self._device)

        config = ViTConfig.from_pretrained('google/vit-base-patch16-224')
        config.num_labels = 4
        config.output_attentions = True

        self._model = ViTForImageClassification.from_pretrained(
            'google/vit-base-patch16-224', config=config, ignore_mismatched_sizes=True
        )
        self._model.load_state_dict(checkpoint['model_state_dict'])
        self._model.to(self._device)
        self._model.eval()
        self._processor = ViTImageProcessor.from_pretrained('google/vit-base-patch16-224')
        print("Model loaded successfully")

    def _remap_prediction(self, old_idx, probs):
        if old_idx == 0:
            valid_probs = probs[[1, 2, 3]]
            new_idx = torch.argmax(valid_probs).item()
            return self.CLASS_NAMES[new_idx], float(valid_probs[new_idx]), old_idx
        return self.CLASS_NAMES[old_idx - 1], float(probs[old_idx]), old_idx

    def predict(self, image_path):
        start_time = time.time()
        image_path = str(image_path)

        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")

        original_image = Image.open(image_path).convert('RGB')
        cropped_image, crop_bbox = RealWorldECGAnalyzer.crop_ecg_grid(original_image)

        inputs = self._processor(images=cropped_image, return_tensors="pt")
        pixel_values = inputs['pixel_values'].to(self._device)

        # Forward pass
        with torch.no_grad():
            outputs = self._model(pixel_values, output_attentions=True)
        
        probs = F.softmax(outputs.logits, dim=1)[0]
        old_idx = torch.argmax(probs).item()
        predicted_class, confidence, target_idx = self._remap_prediction(old_idx, probs)

        all_probabilities = {
            'MI_History': float(probs[1]),
            'MI_Patient': float(probs[2]),
            'Normal': float(probs[3])
        }

        lead_boxes = RealWorldECGAnalyzer.get_lead_boxes(original_image.width, original_image.height)

        # === METHOD 1: ATTENTION ROLLOUT ===
        attention_map = MultiMethodInterpreter.attention_rollout(self._model, pixel_values)

        # === METHOD 2: INTEGRATED GRADIENTS ===
        ig_map = MultiMethodInterpreter.integrated_gradients(
            self._model, pixel_values, target_idx, steps=30
        )

        # === METHOD 3: ABLATION STUDY ===
        ablation_results = MultiMethodInterpreter.ablation_study(
            self._model, self._processor, original_image, 
            lead_boxes, probs, target_idx, self._device
        )

        # Compute per-lead scores
        lead_scores = MultiMethodInterpreter.compute_lead_scores(
            attention_map, ig_map, lead_boxes, (original_image.height, original_image.width)
        )

        # Calculate consensus
        consensus, overall_consensus = MultiMethodInterpreter.calculate_consensus(lead_scores, ablation_results)

        # Build lead analysis
        lead_analysis = {}
        for lead in lead_scores.keys():
            info = MultiMethodInterpreter.LEAD_INFO[lead]
            lead_analysis[lead] = {
                'attention_score': round(lead_scores[lead]['attention_score'] * 100, 1),
                'gradient_score': round(lead_scores[lead]['gradient_score'] * 100, 1),
                'ablation_impact': round(ablation_results[lead]['drop_percentage'], 1),
                'consensus_level': consensus[lead]['level'],
                'consensus_stars': consensus[lead]['stars'],
                'territory': info['territory'],
                'artery': info['artery'],
                'ranks': {
                    'attention': consensus[lead]['attn_rank'],
                    'gradient': consensus[lead]['grad_rank'],
                    'ablation': consensus[lead]['ablation_rank']
                }
            }

        # Generate lead grid image (instead of heatmap)
        lead_grid_img = MultiMethodInterpreter.generate_lead_grid_image(
            original_image, lead_analysis, consensus
        )
        orig_path = Path(image_path)
        grid_path = orig_path.parent / f"{orig_path.stem}_leadgrid{orig_path.suffix}"
        lead_grid_img.save(grid_path)
        grid_url = str(grid_path.relative_to(Path(settings.MEDIA_ROOT))).replace('\\', '/')

        critical_leads = [l for l, c in consensus.items() if c['level'] == 'critical']
        important_leads = [l for l, c in consensus.items() if c['level'] == 'important']

        interpretation = self._build_interpretation(
            predicted_class, confidence, critical_leads, important_leads, 
            overall_consensus, lead_analysis
        )

        result = {
            'diagnosis': predicted_class,
            'confidence': round(confidence, 4),
            'risk_level': self.RISK_MAPPING[predicted_class],
            'probabilities': all_probabilities,
            'lead_grid_path': grid_url,  # Changed from attention_map_path
            'lead_analysis': lead_analysis,
            'interpretability': {
                'consensus_score': overall_consensus['score'],
                'consensus_level': overall_consensus['level'],
                'critical_leads': critical_leads,
                'important_leads': important_leads,
                'method_agreement': overall_consensus['top_leads_by_method'],
                'common_leads': overall_consensus['common_critical_leads']
            },
            'interpretation': interpretation,
            'processing_time': round(time.time() - start_time, 2),
            'metadata': {
                'model': 'ViT-ECG',
                'interpretability_methods': ['Attention Rollout', 'Integrated Gradients', 'Ablation Study'],
                'ig_steps': 30
            }
        }
        
        print(f"[DEBUG] Consensus: {overall_consensus['level']} ({overall_consensus['score']}%)")
        print(f"[DEBUG] Critical leads: {critical_leads}")
        
        return result

    def _build_interpretation(self, predicted_class, confidence, critical, important, consensus, lead_analysis):
        """Build clinical interpretation"""
        all_key_leads = critical + important[:2]
        
        if not all_key_leads:
            all_key_leads = sorted(lead_analysis.keys(), 
                                   key=lambda x: lead_analysis[x]['attention_score'], 
                                   reverse=True)[:3]
        
        territories = list(set([lead_analysis[l]['territory'] for l in all_key_leads[:3]]))
        primary_territory = territories[0] if territories else 'unknown'
        
        if predicted_class == 'MI_Patient':
            summary = f"Findings consistent with acute myocardial infarction. Confidence: {confidence*100:.1f}%."
            if consensus['level'] == 'HIGH':
                method_note = f"All three methods agree on critical leads: {', '.join(critical)}."
            else:
                method_note = f"Primary attention on leads: {', '.join(all_key_leads[:3])}."
            clinical = f"Pattern localizes to {primary_territory} territory."
            recommendation = "Urgent: Correlate with clinical presentation and cardiac biomarkers."
            
        elif predicted_class == 'MI_History':
            summary = f"Findings consistent with prior myocardial infarction. Confidence: {confidence*100:.1f}%."
            method_note = f"Key leads identified: {', '.join(all_key_leads[:3])}."
            clinical = f"Old infarction pattern in {primary_territory} territory."
            recommendation = "Recommend cardiology follow-up and echocardiogram."
            
        else:
            summary = f"No significant abnormalities identified. Confidence: {confidence*100:.1f}%."
            method_note = "Attention distributed across leads without focal abnormality."
            clinical = "Normal sinus rhythm without ischemic changes."
            recommendation = "Routine follow-up as indicated."

        return {
            'title': predicted_class.replace('_', ' '),
            'summary': summary,
            'method_agreement': method_note,
            'clinical_correlation': clinical,
            'recommendation': recommendation,
            'key_findings': [
                {'lead': l, 'attention': f"{lead_analysis[l]['attention_score']}%",
                 'gradient': f"+{lead_analysis[l]['gradient_score']}%",
                 'ablation': f"-{lead_analysis[l]['ablation_impact']}%",
                 'territory': lead_analysis[l]['territory']}
                for l in all_key_leads[:4]
            ]
        }