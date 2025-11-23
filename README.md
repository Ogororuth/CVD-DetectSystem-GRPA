# CVD Detect System - Heart Disease Diagnosis Using Vision Transformers

## Project Overview

A full-stack web application with Django backend and Next.js frontend that provides interpretable heart disease diagnosis from ECG images using Vision Transformers. The system offers real-time analysis with clinical-grade accuracy and transparent decision-making for healthcare professionals.

**Key Features:**
- **High Accuracy**: 91.98% validation accuracy across four cardiac conditions
- **Interpretable AI**: Attention mechanisms and integrated gradients for clinical transparency
- **Multi-class Classification**: Detects Normal, Abnormal, History of MI, and Active MI
- **Modern Web Interface**: Next.js frontend with responsive design
- **Real-time Processing**: Sub-second ECG analysis
- **Security**: Two-factor authentication and secure user management

## System Architecture

### Backend (Django)
- **Framework**: Django REST Framework
- **Database**: SQLite (development) / PostgreSQL (production)
- **AI Model**: Vision Transformer (ViT) for ECG classification

### Frontend (Next.js)
- **Framework**: Next.js 15.5.5 with React
- **Styling**: Modern CSS-in-JS or Tailwind CSS
- **API Integration**: RESTful API communication with Django backend
- **Responsive Design**: Mobile-first approach

## Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

## Backend Setup

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Create Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
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

### 5. Run Backend Server
```bash
python manage.py runserver
```

Backend will be available at: `http://127.0.0.1:8000`

## Frontend Setup

### 1. Navigate to Frontend Directory
```bash
cd ../frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Frontend Development Server
```bash
npm run dev
```

Frontend will be available at: `http://localhost:3001` (or next available port)

### Access Points
- **Frontend Application**: `http://localhost:3001`
- **Backend API**: `http://127.0.0.1:8000`
- **Admin Interface**: `http://127.0.0.1:8000/admin/`

## Model Training

### Training Configuration
- **Dataset**: Mendeley ECG (928 images, 4 classes)
- **Split**: 80% training (741), 20% validation (187)
- **Epochs**: 15 with early stopping (5 patience)
- **Batch Size**: 16
- **Learning Rate**: 1e-5
- **Optimizer**: AdamW with weight decay 0.01

### Training Commands
```bash
# The model is pre-trained and included in core/ml_models/weights/
# For retraining, use your existing training scripts
python train_vision_transformer.py --data_dir /path/to/ecg_data
```

## Performance Metrics

### Overall Performance
- **Accuracy**: 91.98%
- **Precision**: 92.9%
- **Recall**: 92.0%
- **F1-Score**: 92.1%

### Class-wise Performance
- **Abnormal**: 100% precision, 91.5% recall
- **MI_Patient**: 100% precision, 89.6% recall  
- **MI_History**: 90.6% precision, 82.9% recall
- **Normal**: 82.6% precision, 100% recall

## Usage Guide

### For Healthcare Professionals
1. **Access the application** at `http://localhost:3001`
2. **Register/Login** with secure authentication
3. **Upload ECG** images through the intuitive interface
4. **View Results** with interpretable attention maps and confidence scores
5. **Download Reports** for patient records and clinical documentation

### For Administrators
1. Access the **Admin Panel** at `http://127.0.0.1:8000/admin/`
2. **Manage Users** and their permissions
3. **Monitor Scans** and system usage statistics
4. **Generate Analytics** on model performance and user activity

## API Usage

### ECG Classification Endpoint
// Upload ECG for Analysis
POST /api/scans/upload/
Content-Type: multipart/form-data

Form Data:
- ecg_image: <file_upload>
- patient_age: 45
- patient_gender: "M"

Response:
{
  "id": 123,
  "prediction": "Active_MI",
  "confidence": 0.94,
  "attention_map": "base64_image_data",
  "clinical_insights": "ST-segment elevation detected in anterior leads",
  "created_at": "2024-01-15T10:30:00Z"
}

```

### Available Endpoints
- `GET /api/scans/` - List user's previous scans
- `GET /api/scans/{id}/` - Retrieve specific scan details
- `POST /api/scan/upload/` - Upload new ECG for analysis
- `GET /api/admin/users/` - User management (admin only)
- `GET /api/admin/scans/` - Scan management (admin only)

## Development

### Backend Development
```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Running Tests
```bash
# Backend tests
cd backend
python manage.py test
python test_api.py
python test_scan_upload.py

```

## Key Features

### 1. Interpretable AI
- **Attention Visualization**: Heatmaps showing influential ECG regions
- **Integrated Gradients**: Feature attribution for clinical validation
- **Ablation Studies**: Model behavior analysis

### 2. Security & Authentication
- **Two-Factor Authentication**: Enhanced login security
- **Secure File Upload**: ECG image validation and processing
- **Session Management**: Secure user sessions

### 3. Modern User Experience
- **Responsive Design**: Works seamlessly on desktop
- **Real-time Updates**: Live feedback during ECG processing
- **Intuitive Interface**: User-friendly design for healthcare professionals
- **Professional Reporting**: Downloadable clinical reports

## Testing

Run the comprehensive test suite:
```bash
# Backend tests
cd backend
python manage.py test
python test_api.py
python test_scan_upload.py
python test_admin_module.py
python test_report_generation.py
python test_2fa.py

```

## Model Interpretability

The system provides multiple interpretability features:
- **Attention Maps**: Visualize which ECG regions influenced the diagnosis
- **Integrated Gradients**: Quantify feature importance
- **Ablation Analysis**: Understand model decision boundaries
- **Clinical Correlation**: Map AI insights to medical knowledge

## Data Privacy

The system implements data protection measures including:
- Secure user authentication and authorization
- Access controls and audit logging
- Compliance with data protection best practices

## Troubleshooting

### Common Issues
1. **Port 3000 in use**: Frontend will automatically use next available port (3001, 3002, etc.)
2. **CORS errors**: Ensure backend CORS settings include frontend URL
3. **ModuleNotFoundError**: Ensure all dependencies are installed from requirements.txt
4. **Database errors**: Run `python manage.py migrate` to apply migrations
5. **Model loading issues**: Check that `vit_ecg_best_v2.pth` exists in `core/ml_models/weights/`

### Getting Help
Check the debug logs in `backend/debug.log` for detailed error information.

## Future Enhancements

1. **Advanced Architectures**: Swin Transformers for hierarchical analysis
2. **Mobile Deployment**: Real-time ECG analysis on mobile devices  
3. **Federated Learning**: Privacy-preserving model training
4. **Expanded Conditions**: Additional cardiac abnormality detection

## Contact

**Developer**: Ruth Mong'ina Ogoro  
**Institution**: Strathmore University  
**Email**: Ruth.ogoro@strathmore.edu  
**Supervisor**: Mr. Deperias Kerre

## Acknowledgments

- Strathmore University School of Computing and Engineering Sciences
- Mendeley Data for the ECG dataset
- Open-source community for machine learning libraries
- Medical professionals for clinical validation
