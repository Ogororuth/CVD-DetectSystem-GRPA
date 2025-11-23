# Interpretable Machine Learning Model for Heart Disease Diagnosis Using Vision Transformers

## Project Overview

This research project develops an interpretable machine learning model leveraging Vision Transformers (ViTs) to enhance heart disease diagnosis by analyzing ECG images. The system achieves state-of-the-art performance in cardiovascular disease detection while providing transparent decision-making insights for medical practitioners.

**Key Features:**
- **High Accuracy**: 91.98% validation accuracy across four heart condition classes
- **Interpretable AI**: Attention mechanisms highlight clinically relevant ECG regions
- **Multi-class Classification**: Detects Normal, Abnormal, History of MI, and Active MI conditions
- **Web Interface**: User-friendly Django application for ECG upload and analysis
- **Real-time Processing**: Sub-second inference times for rapid diagnosis

## Models & Performance

### Vision Transformer Architecture
- **Base Model**: Pre-trained Vision Transformer adapted for medical imaging
- **Input**: Standardized ECG images (224×224 pixels)
- **Output**: 4-class classification with confidence scores
- **Training**: Transfer learning with fine-tuning on ECG dataset

### Performance Metrics
- **Overall Accuracy**: 91.98%
- **Precision**: 92.9%
- **Recall**: 92.0%
- **F1-Score**: 92.1%

### Class-wise Performance
- **Normal**: High detection accuracy with conservative predictions for uncertain cases
- **Abnormal**: Perfect precision in detecting irregular heart rhythms
- **History of MI**: Reliable identification of prior myocardial infarction cases
- **Active MI**: Perfect precision in detecting current myocardial infarction

## Dataset

### Source & Composition
- **Source**: Mendeley ECG Dataset
- **Total Images**: 928 ECG recordings across four categories
- **Class Distribution**:
  - Normal ECG recordings: 284 images
  - Abnormal tracings: 233 images
  - History of myocardial infarction: 172 images
  - Active myocardial infarction: 239 images

### Data Preparation
- **Split Ratio**: 80-20 train-validation split (741 training, 187 validation)
- **Image Standardization**: Resized to 224×224 pixels, normalized using ImageNet statistics
- **Data Augmentation**:
  - Random rotations (up to 5 degrees)
  - Horizontal flipping (20% of images)
  - Brightness and contrast adjustments (10%)
  - Random translations (up to 3%)

## System Requirements

### Hardware Specifications
| Component | Development Setup | Minimum Required |
|-----------|-------------------|------------------|
| Processor | Intel Core i7 | Intel Core i5 or equivalent |
| RAM | 16 GB | 8 GB |
| Storage | 1 TB | 500 GB |
| Graphics | NVIDIA RTX 3060 | Integrated graphics |
| Network | Broadband internet | Stable internet connection |

*Note: For training, Google Colab with Tesla T4 GPU was used*

### Software Specifications
| Software | Version | Purpose |
|----------|---------|---------|
| Operating System | Windows 10/11 or Ubuntu | System platform |
| Python | 3.8 or higher | Programming language |
| Django | 4.2.7 | Web framework |
| PyTorch | 2.0.1 | Machine learning library |
| PostgreSQL | 14.0 | Database |
| Web browser | Chrome or Firefox | User interface |

## Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-username/heart-disease-detection.git
cd heart-disease-detection
```

### 2. Create Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# OR
venv\Scripts\activate  # Windows
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Database Setup
```bash
python manage.py migrate
python manage.py createsuperuser
```

### 5. Run Development Server
```bash
python manage.py runserver
```

Access the application at: `http://127.0.0.1:8000`

## Usage

### Web Interface
1. **User Registration**: Create an account with secure authentication
2. **ECG Upload**: Upload ECG images through the web interface
3. **Real-time Analysis**: System processes images in sub-second time
4. **Results Display**: View classification results with confidence scores
5. **Interpretability**: Examine attention maps highlighting relevant ECG regions

### API Endpoints
```python
# ECG Classification Endpoint
POST /api/classify-ecg/
{
    "ecg_image": "file_upload",
    }
}

# Response
{
    "prediction": "Active_MI",
    "confidence": 0.94,
    "attention_map": "base64_encoded_image",
    "timestamp": "2024-01-15T10:30:00Z"
}
```

## Model Training

### Training Process
1. **Data Preparation**: Custom PyTorch dataset class with augmentation
2. **Model Configuration**: Vision Transformer Base with modified classification head
3. **Training Parameters**:
   - Epochs: 20
   - Batch Size: 16
   - Learning Rate: 2e-5
   - Weight Decay: 0.01
   - Loss Function: Cross-entropy with class weights

### Training Commands
```bash
# Train Vision Transformer model
python train_vision_transformer.py --data_path /path/to/ecg_dataset --epochs 20 --batch_size 16

# Evaluate model performance
python evaluate_model.py --model_path models/vision_transformer_best.pth --test_data /path/to/test_data
```

## Project Structure

```
heart-disease-detection/
├── app/                          # Django application
│   ├── models.py                 # Database models
│   ├── views.py                  # Application views
│   ├── urls.py                   URL routing
│   └── templates/                # HTML templates
├── ml_model/                     # Machine learning components
│   ├── vision_transformer.py     # ViT model architecture
│   ├── data_loader.py           # Data loading and preprocessing
│   ├── train.py                 # Training scripts
│   └── inference.py             # Prediction pipeline
├── static/                       # Static files (CSS, JS, images)
├── media/                        # Uploaded ECG images
├── requirements.txt              # Python dependencies
├── manage.py                     # Django management script
└── README.md                     # Project documentation
```

## Key Features

### 1. Interpretable AI
- **Attention Visualization**: Generate heatmaps showing which ECG regions influenced predictions
- **Confidence Scoring**: Transparent probability estimates for each classification
- **Clinical Validation**: Attention maps align with cardiologist-identified important regions

### 2. Web Application
- **User Authentication**: Secure login and registration
- **ECG Management**: Upload, store, and manage patient ECG records
- **Report Generation**: Professional medical reports with predictions and interpretations
- **Responsive Design**: Accessible on desktop

## Testing & Validation

### Testing Methodology
- **White-box Testing**: Internal component validation and parameter analysis
- **Black-box Testing**: End-to-end functionality testing
- **Integration Testing**: Complete workflow validation
- **Performance Testing**: Response time and scalability assessment

### Test Results
| Test Component | Metric | Result |
|----------------|--------|--------|
| Model Accuracy | Validation Accuracy | 91.98% |
| Model Precision | Weighted Precision | 92.9% |
| System Response | ECG Analysis Time | <60 seconds |
| User Workflow | End-to-end Processing | <60 seconds |

## Security & Compliance

### Security Features
- **User Authentication**: Secure login with session management
- **Data Protection**: Encrypted storage and transmission

### Medical Compliance
- **Data Privacy**: HIPAA-compliant handling of patient information
- **Clinical Safety**: Operates as supplementary tool with specialist oversight
- **Quality Assurance**: Continuous monitoring and validation protocols

## Future Work

### Planned Enhancements
1. **Advanced Architectures**: Implement hierarchical vision transformers (Swin Transformers)
2. **Expanded Diagnosis**: Include wider range of heart conditions and rare abnormalities
3. **Mobile Deployment**: Real-time ECG analysis on mobile devices
4. **Temporal Analysis**: Sequence modeling for dynamic ECG pattern recognition
5. **Multi-institutional Validation**: Testing on diverse datasets from multiple healthcare institutions

### Research Directions
- **Transfer Learning**: Adapt pre-trained models for specific cardiac conditions
- **Explainable AI**: Enhanced interpretability techniques for clinical trust

## Contact

**Student**: Ruth Mong'ina Ogoro  
**Institution**: Strathmore University  
**Email**: Ruth.ogoro@strathmore.edu
**Supervisor**: Mr. Deperias Kerre

## Acknowledgments

- Strathmore University School of Computing and Engineering Sciences
- Mendeley Data for providing the ECG dataset
- Google Colab for computational resources
- The open-source community for machine learning libraries and tools

---

*This research represents a significant advancement in automated cardiovascular disease diagnosis, providing both accurate predictions and transparency for clinical adoption.*[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/F63P1L7A)
[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=20100699&assignment_repo_type=AssignmentRepo)
