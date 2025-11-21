"""
Enhanced ECG Report Generator with Attention Maps and Clinical Interpretations
File: backend/core/report_generator.py
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from datetime import datetime
import os
from django.conf import settings
from pathlib import Path


class ScanReportGenerator:
    """Enhanced PDF report generator for ECG scans"""
    
    def __init__(self, scan):
        self.scan = scan
        self.user = scan.user
        self.prediction = scan.prediction_result
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        
    def _setup_custom_styles(self):
        """Create custom paragraph styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Subtitle style
        self.styles.add(ParagraphStyle(
            name='SectionTitle',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#2563eb'),
            spaceAfter=12,
            spaceBefore=20,
            fontName='Helvetica-Bold'
        ))
        
        # Risk alert style
        self.styles.add(ParagraphStyle(
            name='RiskAlert',
            parent=self.styles['Normal'],
            fontSize=14,
            textColor=colors.HexColor('#dc2626'),
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
            spaceAfter=20
        ))
        
        # Clinical text style
        self.styles.add(ParagraphStyle(
            name='Clinical',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#374151'),
            spaceAfter=8,
            leading=16
        ))
        
        # Disclaimer style
        self.styles.add(ParagraphStyle(
            name='Disclaimer',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#6b7280'),
            alignment=TA_CENTER,
            spaceAfter=10,
            fontName='Helvetica-Oblique'
        ))
    
    def generate_report(self):
        """Generate comprehensive PDF report"""
        # Create reports directory
        reports_dir = Path(settings.MEDIA_ROOT) / 'reports'
        reports_dir.mkdir(exist_ok=True)
        
        # Generate filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"ECG_Report_{self.scan.id}_{timestamp}.pdf"
        filepath = reports_dir / filename
        
        # Create PDF
        doc = SimpleDocTemplate(
            str(filepath),
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
        )
        
        # Build story (content)
        story = []
        
        # Header
        story.extend(self._create_header())
        
        # Diagnosis Summary
        story.extend(self._create_diagnosis_summary())
        
        # ECG Images
        story.extend(self._create_image_section())
        
        # Probability Breakdown
        story.extend(self._create_probability_section())
        
        # Clinical Interpretation
        story.extend(self._create_interpretation_section())
        
        # Metadata
        story.extend(self._create_metadata_section())
        
        # Disclaimer
        story.extend(self._create_disclaimer())
        
        # Build PDF
        doc.build(story, onFirstPage=self._add_watermark, onLaterPages=self._add_watermark)
        
        # Return relative path from MEDIA_ROOT
        return f"reports/{filename}"
    
    def _create_header(self):
        """Create report header"""
        elements = []
        
        # Title
        title = Paragraph("ECG ANALYSIS REPORT", self.styles['CustomTitle'])
        elements.append(title)
        elements.append(Spacer(1, 0.2*inch))
        
        # Patient and scan info
        info_data = [
            ['Report ID:', f'#{self.scan.id}'],
            ['Patient Name:', self.user.get_full_name()],
            ['Patient Email:', self.user.email],
            ['Analysis Date:', self.scan.created_at.strftime('%B %d, %Y at %I:%M %p')],
            ['Processing Time:', f'{self.prediction.get("metadata", {}).get("processing_time", self.scan.processing_time):.2f} seconds'],
        ]
        
        info_table = Table(info_data, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 10),
            ('FONT', (1, 0), (1, -1), 'Helvetica', 10),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#374151')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(info_table)
        elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _create_diagnosis_summary(self):
        """Create diagnosis summary box"""
        elements = []
        
        diagnosis = self.prediction.get('diagnosis', 'Unknown')
        confidence = self.prediction.get('confidence', 0) * 100
        risk_level = self.scan.risk_level.upper()
        
        # Risk color mapping
        risk_colors = {
            'LOW': colors.HexColor('#10b981'),
            'MODERATE': colors.HexColor('#f59e0b'),
            'HIGH': colors.HexColor('#dc2626')
        }
        risk_color = risk_colors.get(risk_level, colors.grey)
        
        # Create diagnosis box
        diagnosis_data = [
            ['DIAGNOSIS', diagnosis.replace('_', ' ')],
            ['CONFIDENCE', f'{confidence:.1f}%'],
            ['RISK LEVEL', risk_level]
        ]
        
        diagnosis_table = Table(diagnosis_data, colWidths=[2*inch, 4*inch])
        diagnosis_table.setStyle(TableStyle([
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 12),
            ('FONT', (1, 0), (1, -1), 'Helvetica-Bold', 14),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1a1a1a')),
            ('TEXTCOLOR', (1, 2), (1, 2), risk_color),  # Risk level color
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f3f4f6')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('PADDING', (0, 0), (-1, -1), 12),
            ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#d1d5db')),
        ]))
        
        elements.append(diagnosis_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Add urgent warning for high risk
        if risk_level == 'HIGH':
            warning = Paragraph(
                "⚠️ URGENT: This ECG shows signs requiring immediate medical attention",
                self.styles['RiskAlert']
            )
            elements.append(warning)
            elements.append(Spacer(1, 0.2*inch))
        
        return elements
    
    def _create_image_section(self):
        """Create ECG image section with attention map"""
        elements = []
        
        # Section title
        title = Paragraph("ECG Analysis Visualization", self.styles['SectionTitle'])
        elements.append(title)
        
        # Original ECG image
        original_img_path = Path(settings.MEDIA_ROOT) / self.scan.image_path
        if original_img_path.exists():
            img = Image(str(original_img_path), width=5*inch, height=3*inch, kind='proportional')
            elements.append(img)
            elements.append(Paragraph("Original ECG", self.styles['Clinical']))
            elements.append(Spacer(1, 0.2*inch))
        
        # Attention map
        if self.scan.attention_map_path:
            attention_img_path = Path(settings.MEDIA_ROOT) / self.scan.attention_map_path
            if attention_img_path.exists():
                img = Image(str(attention_img_path), width=5*inch, height=3*inch, kind='proportional')
                elements.append(img)
                elements.append(Paragraph(
                    "Attention Map - Highlighted regions show areas the AI model focused on during analysis",
                    self.styles['Clinical']
                ))
                elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _create_probability_section(self):
        """Create probability breakdown section"""
        elements = []
        
        title = Paragraph("Classification Probabilities", self.styles['SectionTitle'])
        elements.append(title)
        
        probabilities = self.prediction.get('probabilities', {})
        
        # Sort by probability (highest first)
        sorted_probs = sorted(probabilities.items(), key=lambda x: x[1], reverse=True)
        
        # Create probability table
        prob_data = [['Classification', 'Probability', 'Bar']]
        
        for class_name, prob in sorted_probs:
            prob_percent = f'{prob * 100:.1f}%'
            bar_length = int(prob * 20)  # Scale to 20 characters
            bar = '█' * bar_length + '░' * (20 - bar_length)
            prob_data.append([
                class_name.replace('_', ' '),
                prob_percent,
                bar
            ])
        
        prob_table = Table(prob_data, colWidths=[2*inch, 1.5*inch, 2.5*inch])
        prob_table.setStyle(TableStyle([
            # Header row
            ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 11),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            
            # Data rows
            ('FONT', (0, 1), (-1, -1), 'Helvetica', 10),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#374151')),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),
            ('ALIGN', (1, 1), (1, -1), 'CENTER'),
            ('ALIGN', (2, 1), (2, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('PADDING', (0, 0), (-1, -1), 10),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            
            # Highlight highest probability row
            ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#dbeafe')),
        ]))
        
        elements.append(prob_table)
        elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _create_interpretation_section(self):
        """Create clinical interpretation section"""
        elements = []
        
        interpretation = self.prediction.get('interpretation', {})
        
        if not interpretation:
            return elements
        
        title = Paragraph("Clinical Interpretation", self.styles['SectionTitle'])
        elements.append(title)
        
        # Interpretation title
        interp_title = interpretation.get('title', '')
        if interp_title:
            elements.append(Paragraph(f"<b>{interp_title}</b>", self.styles['Clinical']))
            elements.append(Spacer(1, 0.1*inch))
        
        # Findings
        findings = interpretation.get('findings', [])
        if findings:
            elements.append(Paragraph("<b>Findings:</b>", self.styles['Clinical']))
            for finding in findings:
                elements.append(Paragraph(f"• {finding}", self.styles['Clinical']))
            elements.append(Spacer(1, 0.15*inch))
        
        # Recommendation
        recommendation = interpretation.get('recommendation', '')
        if recommendation:
            elements.append(Paragraph("<b>Recommendation:</b>", self.styles['Clinical']))
            elements.append(Paragraph(recommendation, self.styles['Clinical']))
            elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _create_metadata_section(self):
        """Create metadata section"""
        elements = []
        
        title = Paragraph("Analysis Metadata", self.styles['SectionTitle'])
        elements.append(title)
        
        metadata = self.prediction.get('metadata', {})
        
        metadata_data = [
            ['Model Version:', metadata.get('model_version', 'N/A')],
            ['Processing Device:', metadata.get('device', 'N/A')],
            ['Scan ID:', f'#{self.scan.id}'],
            ['Analysis Timestamp:', self.scan.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')],
        ]
        
        if self.scan.notes:
            metadata_data.append(['Notes:', self.scan.notes])
        
        metadata_table = Table(metadata_data, colWidths=[2*inch, 4*inch])
        metadata_table.setStyle(TableStyle([
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 9),
            ('FONT', (1, 0), (1, -1), 'Helvetica', 9),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#6b7280')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(metadata_table)
        elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _create_disclaimer(self):
        """Create disclaimer section"""
        elements = []
        
        disclaimer_text = """
        <b>IMPORTANT MEDICAL DISCLAIMER:</b><br/>
        This ECG analysis report is generated by an artificial intelligence system for research 
        and educational purposes only. This system is NOT a substitute for professional medical 
        diagnosis, advice, or treatment. Always seek the advice of qualified healthcare providers 
        with any questions regarding medical conditions. Never disregard professional medical 
        advice or delay seeking it because of information provided by this AI system. 
        In case of a medical emergency, call your local emergency services immediately.
        """
        
        # Add border box for disclaimer
        disclaimer_para = Paragraph(disclaimer_text, self.styles['Disclaimer'])
        
        disclaimer_table = Table([[disclaimer_para]], colWidths=[6.5*inch])
        disclaimer_table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#dc2626')),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fef2f2')),
            ('PADDING', (0, 0), (-1, -1), 15),
        ]))
        
        elements.append(disclaimer_table)
        
        return elements
    
    def _add_watermark(self, canvas, doc):
        """Add watermark/footer to each page"""
        canvas.saveState()
        
        # Footer text
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#9ca3af'))
        
        footer_text = f"CVD Detection System | Generated on {datetime.now().strftime('%B %d, %Y')} | Page {doc.page}"
        canvas.drawCentredString(
            letter[0] / 2,
            0.5 * inch,
            footer_text
        )
        
        # Watermark (if needed)
        canvas.setFont('Helvetica-Bold', 60)
        canvas.setFillColor(colors.HexColor('#f3f4f6'))
        canvas.rotate(45)
        canvas.drawCentredString(6*inch, 0, "AI ANALYSIS")
        
        canvas.restoreState()