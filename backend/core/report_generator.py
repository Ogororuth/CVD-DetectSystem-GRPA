"""
PDF Report Generator for CVD Detection System
"""
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image as RLImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime
import os
from django.conf import settings


class ScanReportGenerator:
    """Generate PDF reports for scan analysis"""
    
    def __init__(self, scan):
        self.scan = scan
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Title style
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a365d'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        # Subtitle style
        self.subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#2d3748'),
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        )
        
        # Normal text style
        self.normal_style = ParagraphStyle(
            'CustomNormal',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#4a5568'),
            spaceAfter=6
        )
        
        # Risk indicator styles
        self.risk_styles = {
            'low': colors.HexColor('#48bb78'),      # Green
            'moderate': colors.HexColor('#ed8936'), # Orange
            'high': colors.HexColor('#f56565')      # Red
        }
    
    def generate_report(self):
        """Generate PDF report and return file path"""
        # Create reports directory if not exists
        reports_dir = os.path.join(settings.MEDIA_ROOT, 'reports')
        os.makedirs(reports_dir, exist_ok=True)
        
        # Generate filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"scan_report_{self.scan.id}_{timestamp}.pdf"
        filepath = os.path.join(reports_dir, filename)
        
        # Create PDF document
        doc = SimpleDocTemplate(
            filepath,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        
        # Build content
        story = []
        story.extend(self._build_header())
        story.extend(self._build_patient_info())
        story.extend(self._build_risk_assessment())
        story.extend(self._build_analysis_details())
        story.extend(self._build_model_info())
        story.extend(self._build_disclaimer())
        story.extend(self._build_footer())
        
        # Generate PDF
        doc.build(story)
        
        # Return relative path for database storage
        return os.path.join('reports', filename)
    
    def _build_header(self):
        """Build report header"""
        elements = []
        
        # Title
        title = Paragraph("HEART DISEASE DETECTION REPORT", self.title_style)
        elements.append(title)
        elements.append(Spacer(1, 0.2*inch))
        
        # Report metadata
        report_info = [
            ['Report ID:', f'#CVD-{self.scan.id:05d}'],
            ['Generated:', datetime.now().strftime('%B %d, %Y at %H:%M UTC')],
            ['Scan Date:', self.scan.created_at.strftime('%B %d, %Y at %H:%M UTC')]
        ]
        
        table = Table(report_info, colWidths=[2*inch, 4*inch])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#4a5568')),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _build_patient_info(self):
        """Build patient information section"""
        elements = []
        
        user = self.scan.user
        
        # Section title
        elements.append(Paragraph("PATIENT INFORMATION", self.subtitle_style))
        
        # Patient data (anonymized for privacy)
        patient_data = [
            ['Name:', '[Redacted for Privacy]'],
            ['Age:', str(user.age)],
            ['Gender:', user.get_gender_display()],
            ['Country:', user.country],
        ]
        
        table = Table(patient_data, colWidths=[2*inch, 4*inch])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#4a5568')),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _build_risk_assessment(self):
        """Build risk assessment section"""
        elements = []
        
        # Section title
        elements.append(Paragraph("RISK ASSESSMENT", self.subtitle_style))
        
        # Risk level indicator
        risk_color = self.risk_styles.get(self.scan.risk_level, colors.grey)
        risk_text = self.scan.risk_level.upper()
        confidence = f"{self.scan.confidence_score * 100:.1f}%"
        
        risk_data = [
            ['Risk Level:', risk_text, confidence],
        ]
        
        table = Table(risk_data, colWidths=[2*inch, 2*inch, 2*inch])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (0, -1), 12),
            ('FONTSIZE', (1, 0), (1, -1), 16),
            ('FONTSIZE', (2, 0), (2, -1), 12),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#4a5568')),
            ('TEXTCOLOR', (1, 0), (1, -1), risk_color),
            ('TEXTCOLOR', (2, 0), (2, -1), colors.HexColor('#4a5568')),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('ALIGN', (2, 0), (2, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (1, 0), (1, -1), colors.HexColor('#f7fafc')),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 0.2*inch))
        
        # Confidence explanation
        confidence_text = f"The model has <b>{confidence}</b> confidence in this prediction."
        elements.append(Paragraph(confidence_text, self.normal_style))
        elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _build_analysis_details(self):
        """Build detailed analysis section"""
        elements = []
        
        # Section title
        elements.append(Paragraph("ANALYSIS DETAILS", self.subtitle_style))
        
        # Key findings
        prediction = self.scan.prediction_result
        
        if isinstance(prediction, dict) and 'regions' in prediction:
            regions_text = "<b>Regions of Interest:</b><br/>"
            for region in prediction['regions']:
                attention = region.get('attention', 0)
                desc = region.get('description', 'N/A')
                regions_text += f"• Region {region.get('id')}: Attention score {attention:.2f} - {desc}<br/>"
            
            elements.append(Paragraph(regions_text, self.normal_style))
        
        elements.append(Spacer(1, 0.2*inch))
        
        # Processing info
        proc_data = [
            ['Processing Time:', f"{self.scan.processing_time:.2f} seconds"],
            ['Analysis Date:', self.scan.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')],
        ]
        
        table = Table(proc_data, colWidths=[2*inch, 4*inch])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#4a5568')),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Notes if any
        if self.scan.notes:
            elements.append(Paragraph("<b>Additional Notes:</b>", self.normal_style))
            elements.append(Paragraph(self.scan.notes, self.normal_style))
            elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _build_model_info(self):
        """Build model information section"""
        elements = []
        
        elements.append(Paragraph("MODEL INFORMATION", self.subtitle_style))
        
        model_info = [
            ['Model Type:', 'Vision Transformer (ViT)'],
            ['Version:', 'v1.0.0'],
            ['Last Updated:', 'January 2025'],
        ]
        
        table = Table(model_info, colWidths=[2*inch, 4*inch])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#4a5568')),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _build_disclaimer(self):
        """Build disclaimer section"""
        elements = []
        
        elements.append(Paragraph("IMPORTANT DISCLAIMER", self.subtitle_style))
        
        disclaimer_text = """
        <b>⚠️ FOR RESEARCH AND EDUCATIONAL PURPOSES ONLY</b><br/><br/>
        
        This automated analysis is provided for research, educational, and informational purposes only. 
        It is <b>NOT</b> intended as a substitute for professional medical advice, diagnosis, or treatment. 
        <br/><br/>
        
        <b>Always consult qualified healthcare professionals</b> for any questions regarding a medical condition. 
        Never disregard professional medical advice or delay seeking it because of information from this system.
        <br/><br/>
        
        The Vision Transformer model used in this analysis is a research tool and has not been approved 
        by regulatory bodies for clinical diagnostic use. Results should be interpreted with caution and 
        validated by medical professionals.
        """
        
        disclaimer_para = Paragraph(disclaimer_text, self.normal_style)
        
        # Add border around disclaimer
        disclaimer_table = Table([[disclaimer_para]], colWidths=[6.5*inch])
        disclaimer_table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#e53e3e')),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fff5f5')),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
        
        elements.append(disclaimer_table)
        elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _build_footer(self):
        """Build report footer"""
        elements = []
        
        footer_text = f"""
        <br/><br/>
        Generated by CVD Detection System | Report ID: #CVD-{self.scan.id:05d}<br/>
        For questions or concerns, please contact your healthcare provider.
        """
        
        footer_style = ParagraphStyle(
            'Footer',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#718096'),
            alignment=TA_CENTER
        )
        
        elements.append(Paragraph(footer_text, footer_style))
        
        return elements