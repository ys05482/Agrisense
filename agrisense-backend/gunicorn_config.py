# gunicorn_config.py
bind             = "0.0.0.0:5001"
workers          = 1        # Keep at 1 — ML models are not fork-safe
threads          = 4        # Handle concurrent requests with threads
worker_class     = "gthread"
timeout          = 120      # Image inference can be slow
keepalive        = 5
max_requests     = 1000     # Restart worker after N requests (prevents memory bloat)
max_requests_jitter = 100
preload_app      = True     # Load model ONCE before forking
accesslog        = "-"      # Log to stdout
errorlog         = "-"
loglevel         = "info"