"""
ECG Prediction with Real Lead-Level Attention Analysis
"""
import torch
import torch.nn.functional as F
from transformers import ViTForImageClassification, ViTImageProcessor, ViTConfig
from PIL import Image
import numpy as np
import cv2
from pathlib import Path
import time
from django.conf import settings

from .model_loader import ModelDownloader


class ECGLeadMapper:
    """Maps Vision Transformer attention to ECG lead positions"""
    
    # Standard 12-lead ECG layout (3 rows x 4 columns - most common format)
    LEAD_POSITIONS = {
        'I':    {'row': 0, 'col': 0},
        'aVR':  {'row': 0, 'col': 1},
        'V1':   {'row': 0, 'col': 2},
        'V4':   {'row': 0, 'col': 3},
        'II':   {'row': 1, 'col': 0},
        'aVL':  {'row': 1, 'col': 1},
        'V2':   {'row': 1, 'col': 2},
        'V5':   {'row': 1, 'col': 3},
        'III':  {'row': 2, 'col': 0},
        'aVF':  {'row': 2, 'col': 1},
        'V3':   {'row': 2, 'col': 2},
        'V6':   {'row': 2, 'col': 3}
    }
    
    # Lead names in display order
    LEAD_NAMES = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']
    
    @staticmethod
    def map_attention_to_leads(attention_map):
        """
        Map 14x14 attention grid to 12 ECG leads based on spatial position.
        
        Args:
            attention_map: numpy array of shape (14, 14) - ViT attention weights
            
        Returns:
            dict: Lead name -> attention score
        """
        h, w = attention_map.shape  # Should be 14x14 for ViT-Base
        
        # Define grid regions (3 rows x 4 columns for standard ECG)
        row_height = h // 3
        col_width = w // 4
        
        lead_attention = {}
        
        for lead_name, pos in ECGLeadMapper.LEAD_POSITIONS.items():
            # Extract region corresponding to this lead
            row_start = pos['row'] * row_height
            row_end = (pos['row'] + 1) * row_height if pos['row'] < 2 else h
            col_start = pos['col'] * col_width
            col_end = (pos['col'] + 1) * col_width if pos['col'] < 3 else w
            
            # Calculate mean attention in this region
            region_attention = attention_map[row_start:row_end, col_start:col_end]
            lead_attention[lead_name] = float(np.mean(region_attention))
        
        return lead_attention
    
    @staticmethod
    def classify_attention_level(score, percentile_75, percentile_50):
        """Classify attention score into high/medium/low"""
        if score >= percentile_75:
            return 'high'
        elif score >= percentile_50:
            return 'medium'
        else:
            return 'low'


class ECGPredictor:
    """Main predictor class for ECG analysis with lead-level insights"""
    
    # Class names in EXACT training order
    CLASS_NAMES = ['Abnormal', 'MI_History', 'MI_Patient', 'Normal']
    
    # Risk level mapping
    RISK_MAPPING = {
        'MI_Patient': 'high',
        'MI_History': 'moderate',
        'Abnormal': 'moderate',
        'Normal': 'low'
    }
    
    # Clinical interpretations
    CLINICAL_INTERPRETATIONS = {
        'MI_Patient': {
            'title': 'Active Myocardial Infarction Detected',
            'findings': [
                'Active myocardial infarction detected',
                'Elevated ST segments in multiple leads',
                'Abnormal Q waves present'
            ],
            'recommendation': 'URGENT: Seek immediate emergency medical care. This ECG shows signs of an active heart attack requiring immediate intervention.'
        },
        'MI_History': {
            'title': 'Previous Myocardial Infarction History',
            'findings': [
                'ECG patterns consistent with previous myocardial infarction',
                'Pathological Q waves detected',
                'Historical cardiac event indicators present'
            ],
            'recommendation': 'Consult with a cardiologist for comprehensive evaluation and management of post-MI care.'
        },
        'Abnormal': {
            'title': 'Abnormal ECG Pattern Detected',
            'findings': [
                'Irregular cardiac rhythm or morphology detected',
                'Deviations from normal ECG parameters observed',
                'Further clinical correlation recommended'
            ],
            'recommendation': 'Schedule a follow-up appointment with a healthcare provider for detailed cardiac evaluation.'
        },
        'Normal': {
            'title': 'Normal ECG Pattern',
            'findings': [
                'Regular sinus rhythm detected',
                'ECG parameters within normal limits',
                'No acute abnormalities detected'
            ],
            'recommendation': 'Continue routine cardiac health monitoring as advised by your healthcare provider.'
        }
    }
    
    _instance = None
    _model = None
    _processor = None
    _device = None
    
    def __new__(cls):
        """Singleton pattern - load model only once"""
        if cls._instance is None:
            cls._instance = super(ECGPredictor, cls).__new__(cls)
            cls._instance._initialize_model()
        return cls._instance
    
    def _initialize_model(self):
        """Load model and processor"""
        print("Initializing ECG Predictor...")
        
        # Download model if needed
        downloader = ModelDownloader()
        model_path = downloader.get_model_path()
        
        # Set device
        self._device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Using device: {self._device}")
        
        # Load checkpoint
        print(f"Loading model from: {model_path}")
        checkpoint = torch.load(model_path, map_location=self._device)
        
        # Initialize model architecture
        config = ViTConfig.from_pretrained('google/vit-base-patch16-224')
        config.num_labels = 4
        config.output_attentions = True
        
        self._model = ViTForImageClassification.from_pretrained(
            'google/vit-base-patch16-224',
            config=config,
            ignore_mismatched_sizes=True
        )
        
        # Load trained weights
        self._model.load_state_dict(checkpoint['model_state_dict'])
        self._model.to(self._device)
        self._model.eval()
        
        # Load processor
        self._processor = ViTImageProcessor.from_pretrained('google/vit-base-patch16-224')
        
        print("Model loaded successfully")
    
    def predict(self, image_path):
        """
        Run prediction on ECG image with lead-level analysis
        """
        start_time = time.time()
        
        # Load and preprocess image
        image = Image.open(image_path).convert('RGB')
        inputs = self._processor(images=image, return_tensors="pt")
        inputs = {k: v.to(self._device) for k, v in inputs.items()}
        
        # Run inference
        with torch.no_grad():
            outputs = self._model(**inputs, output_attentions=True)
            logits = outputs.logits
            attentions = outputs.attentions
        
        # Get probabilities
        probs = F.softmax(logits, dim=1)[0]
        predicted_idx = torch.argmax(probs).item()
        predicted_class = self.CLASS_NAMES[predicted_idx]
        confidence = probs[predicted_idx].item()
        
        # Get all probabilities
        all_probabilities = {
            self.CLASS_NAMES[i]: float(probs[i].item())
            for i in range(len(self.CLASS_NAMES))
        }
        
        # Extract attention map for lead analysis
        attention = attentions[-1]  # Last layer
        attention = attention[0].mean(dim=0)  # Average across heads
        cls_attention = attention[0, 1:]  # CLS token attention to patches
        
        # Reshape to 2D grid
        num_patches = int(np.sqrt(cls_attention.shape[0]))
        attention_map = cls_attention.reshape(num_patches, num_patches).cpu().numpy()
        
        # Normalize attention map
        attention_map_normalized = (attention_map - attention_map.min()) / (attention_map.max() - attention_map.min())
        
        # Generate real lead-level analysis
        lead_analysis = self._analyze_leads_from_attention(
            attention_map_normalized,
            predicted_class,
            confidence
        )
        
        # Generate attention visualization
        attention_map_path = self._generate_attention_map(
            image, attention_map_normalized, image_path
        )
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Get risk level
        risk_level = self.RISK_MAPPING[predicted_class]
        
        # Get clinical interpretation
        interpretation = self._get_enhanced_interpretation(
            predicted_class, all_probabilities, lead_analysis, confidence
        )
        
        # Build result
        result = {
            'diagnosis': predicted_class,
            'confidence': confidence,
            'risk_level': risk_level,
            'probabilities': all_probabilities,
            'attention_map_path': attention_map_path,
            'processing_time': processing_time,
            'interpretation': interpretation,
            'lead_analysis': lead_analysis,
            'metadata': {
                'model_version': 'ViT-Base v1.0',
                'device': str(self._device),
                'class_order': self.CLASS_NAMES
            }
        }
        
        return result
    
    def _analyze_leads_from_attention(self, attention_map, diagnosis, overall_confidence):
        """
        Analyze lead-level attention using real attention weights.
        
        Args:
            attention_map: 2D numpy array of normalized attention weights
            diagnosis: Predicted class
            overall_confidence: Overall prediction confidence
            
        Returns:
            dict: Lead analysis with real attention scores
        """
        # Map attention to leads
        lead_attention_scores = ECGLeadMapper.map_attention_to_leads(attention_map)
        
        # Calculate percentiles for classification
        scores = list(lead_attention_scores.values())
        percentile_75 = np.percentile(scores, 75)
        percentile_50 = np.percentile(scores, 50)
        
        # Build lead analysis
        lead_analysis = {}
        
        for lead_name in ECGLeadMapper.LEAD_NAMES:
            score = lead_attention_scores[lead_name]
            attention_level = ECGLeadMapper.classify_attention_level(
                score, percentile_75, percentile_50
            )
            
            # Determine primary finding based on diagnosis and attention
            if diagnosis == 'Normal':
                primary_finding = 'Normal sinus rhythm'
            elif diagnosis == 'MI_Patient':
                if attention_level == 'high':
                    primary_finding = 'Significant abnormality detected'
                else:
                    primary_finding = 'Within normal limits'
            elif diagnosis == 'MI_History':
                if attention_level == 'high':
                    primary_finding = 'Historical changes noted'
                else:
                    primary_finding = 'No acute changes'
            else:  # Abnormal
                if attention_level == 'high':
                    primary_finding = 'Irregular pattern detected'
                else:
                    primary_finding = 'Minor variations'
            
            lead_analysis[lead_name] = {
                'attention_score': float(score),
                'attention_level': attention_level,
                'primary_finding': primary_finding,
                'relative_importance': float(score / max(scores)) if max(scores) > 0 else 0.0
            }
        
        return lead_analysis
    
    def _get_enhanced_interpretation(self, predicted_class, probabilities, lead_analysis, confidence):
        """Enhanced interpretation with lead-level insights"""
        base_interpretation = self.CLINICAL_INTERPRETATIONS[predicted_class].copy()
        
        # Identify high-attention leads
        high_attention_leads = [
            lead for lead, analysis in lead_analysis.items()
            if analysis['attention_level'] == 'high'
        ]
        
        # Generate insights
        insights = []
        
        if high_attention_leads:
            insights.append(f"Model focused primarily on leads: {', '.join(high_attention_leads)}")
        
        if confidence < 0.6:
            insights.append("Low confidence prediction - clinical review strongly recommended")
        elif confidence < 0.8:
            insights.append("Moderate confidence - routine clinical correlation advised")
        else:
            insights.append("High confidence prediction with consistent patterns")
        
        # Add lead-specific findings
        key_findings = []
        for lead, analysis in lead_analysis.items():
            if analysis['attention_level'] == 'high' and analysis['primary_finding'] != 'Normal sinus rhythm':
                key_findings.append(f"Lead {lead}: {analysis['primary_finding']}")
        
        base_interpretation['lead_insights'] = insights
        base_interpretation['key_findings'] = key_findings if key_findings else base_interpretation['findings']
        
        return base_interpretation
    
    def _generate_attention_map(self, image, attention_map, original_image_path):
        """Generate attention heatmap overlay"""
        # Resize to original image size
        attention_map_resized = cv2.resize(
            attention_map,
            (image.width, image.height)
        )
        
        # Convert image to numpy array
        img_array = np.array(image)
        
        # Apply colormap
        heatmap = cv2.applyColorMap(
            (attention_map_resized * 255).astype(np.uint8),
            cv2.COLORMAP_HOT
        )
        heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
        
        # Overlay
        overlay = cv2.addWeighted(img_array, 0.6, heatmap, 0.4, 0)
        
        # Save attention map
        original_path = Path(original_image_path)
        attention_filename = f"{original_path.stem}_attention{original_path.suffix}"
        attention_path = original_path.parent / attention_filename
        
        overlay_img = Image.fromarray(overlay)
        overlay_img.save(attention_path)
        
        # Return relative path
        media_root = Path(settings.MEDIA_ROOT)
        relative_path = attention_path.relative_to(media_root)
        return str(relative_path).replace('\\', '/')