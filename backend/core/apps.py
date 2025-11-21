from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    def ready(self):
        """Load ML model on startup"""
        import sys
        
        # Only load in production/development, not during migrations
        if 'runserver' in sys.argv or 'gunicorn' in sys.argv[0]:
            try:
                from core.ml_models.ecg_predictor import ECGPredictor
                print("Pre-loading ECG model...")
                ECGPredictor()  # Singleton initialization
                print("✓ Model pre-loaded successfully!")
            except Exception as e:
                print(f"Warning: Could not pre-load model: {e}")