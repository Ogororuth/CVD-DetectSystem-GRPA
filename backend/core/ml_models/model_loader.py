"""
Model loader with automatic download from Google Drive
"""
import os
import torch
from pathlib import Path
from django.conf import settings

class ModelDownloader:
    """Handles model download and caching"""
    
    # Google Drive file ID extracted from your link
    GDRIVE_FILE_ID = "1bGgrR-Emw5yBiK8RNq0TZrhHbgMVg6zk"
    MODEL_FILENAME = "vit_ecg_best_v2.pth"
    
    def __init__(self):
        # Store models in backend/core/ml_models/weights/
        self.model_dir = Path(settings.BASE_DIR) / 'core' / 'ml_models' / 'weights'
        self.model_path = self.model_dir / self.MODEL_FILENAME
        self.model_dir.mkdir(parents=True, exist_ok=True)
    
    def download_model(self):
        """Download model from Google Drive if not exists"""
        if self.model_path.exists():
            print(f"✓ Model already exists at: {self.model_path}")
            return str(self.model_path)
        
        print(f"Downloading model from Google Drive (932MB - this may take 5-10 minutes)...")
        
        try:
            import gdown
            
            # For large files, use fuzzy=True to handle download warnings
            url = f"https://drive.google.com/uc?id={self.GDRIVE_FILE_ID}"
            
            gdown.download(
                url, 
                str(self.model_path), 
                quiet=False,
                fuzzy=True  # Handle large file warnings automatically
            )
            
            print(f"✓ Model downloaded successfully to: {self.model_path}")
            return str(self.model_path)
            
        except Exception as e:
            error_msg = f"""
Failed to download model: {str(e)}

Please download manually:
1. Go to: https://drive.google.com/file/d/{self.GDRIVE_FILE_ID}/view
2. Click 'Download' 
3. Save to: {self.model_path}
4. Restart Django server
"""
            raise Exception(error_msg)
    
    def get_model_path(self):
        """Get model path, download if necessary"""
        if not self.model_path.exists():
            return self.download_model()
        return str(self.model_path)