"""
Configuration management for LibreCrawl
Loads settings from environment variables with sensible defaults
"""
import os
from dotenv import load_dotenv

# Load .env file if it exists
load_dotenv()

class Config:
    """Application configuration loaded from environment variables"""

    # Flask Configuration
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'librecrawl-secret-key-change-in-production')
    ENV = os.getenv('FLASK_ENV', 'production')
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'

    # Server Configuration
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5000))

    # Session Configuration
    SESSION_TIMEOUT_HOURS = float(os.getenv('SESSION_TIMEOUT_HOURS', 1))
    CLEANUP_INTERVAL_SECONDS = int(os.getenv('CLEANUP_INTERVAL_SECONDS', 300))

    # Database Configuration
    DB_POOL_SIZE = int(os.getenv('DB_POOL_SIZE', 10))
    SETTINGS_CACHE_TTL_SECONDS = int(os.getenv('SETTINGS_CACHE_TTL_SECONDS', 300))

    # Rate Limiting
    ENABLE_RATE_LIMITING = os.getenv('ENABLE_RATE_LIMITING', 'True').lower() == 'true'
    RATE_LIMIT_PER_MINUTE = int(os.getenv('RATE_LIMIT_PER_MINUTE', 60))
    RATE_LIMIT_PER_HOUR = int(os.getenv('RATE_LIMIT_PER_HOUR', 1000))

    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'librecrawl.log')
    ENABLE_FILE_LOGGING = os.getenv('ENABLE_FILE_LOGGING', 'True').lower() == 'true'

    # Security
    ENABLE_CORS = os.getenv('ENABLE_CORS', 'False').lower() == 'true'
    ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5000')

    # Performance
    MAX_CRAWL_RESULTS_IN_MEMORY = int(os.getenv('MAX_CRAWL_RESULTS_IN_MEMORY', 100000))
    ENABLE_RESULT_PAGINATION = os.getenv('ENABLE_RESULT_PAGINATION', 'True').lower() == 'true'
    DEFAULT_PAGE_SIZE = int(os.getenv('DEFAULT_PAGE_SIZE', 100))

    @classmethod
    def validate(cls):
        """Validate configuration values"""
        if cls.SESSION_TIMEOUT_HOURS <= 0:
            raise ValueError("SESSION_TIMEOUT_HOURS must be greater than 0")
        if cls.DB_POOL_SIZE < 1:
            raise ValueError("DB_POOL_SIZE must be at least 1")
        if cls.PORT < 1 or cls.PORT > 65535:
            raise ValueError("PORT must be between 1 and 65535")
        return True

    @classmethod
    def display(cls):
        """Display current configuration (excluding secrets)"""
        config_items = {
            'Environment': cls.ENV,
            'Debug Mode': cls.DEBUG,
            'Host': cls.HOST,
            'Port': cls.PORT,
            'Session Timeout': f"{cls.SESSION_TIMEOUT_HOURS}h",
            'DB Pool Size': cls.DB_POOL_SIZE,
            'Rate Limiting': cls.ENABLE_RATE_LIMITING,
            'Log Level': cls.LOG_LEVEL,
            'File Logging': cls.ENABLE_FILE_LOGGING,
        }
        return config_items
