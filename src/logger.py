"""
Centralized logging configuration for LibreCrawl
Replaces print() statements with proper logging
"""
import logging
import sys
from pathlib import Path
from src.config import Config

# Create logger
logger = logging.getLogger('librecrawl')

def setup_logging():
    """Configure logging for the application"""
    # Clear any existing handlers
    logger.handlers.clear()

    # Set log level from config
    log_level = getattr(logging, Config.LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(log_level)

    # Create formatters
    detailed_formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s:%(lineno)d - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    simple_formatter = logging.Formatter(
        '[%(levelname)s] %(message)s'
    )

    # Console handler (always enabled)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(simple_formatter)
    logger.addHandler(console_handler)

    # File handler (optional)
    if Config.ENABLE_FILE_LOGGING:
        try:
            log_file = Path(Config.LOG_FILE)
            file_handler = logging.FileHandler(log_file)
            file_handler.setLevel(log_level)
            file_handler.setFormatter(detailed_formatter)
            logger.addHandler(file_handler)
            logger.info(f"File logging enabled: {log_file.absolute()}")
        except Exception as e:
            logger.warning(f"Could not enable file logging: {e}")

    logger.info(f"Logging initialized at {log_level} level")
    return logger

# Initialize logging on module import
setup_logging()

# Export common logging functions for easy import
def info(msg, *args, **kwargs):
    logger.info(msg, *args, **kwargs)

def warning(msg, *args, **kwargs):
    logger.warning(msg, *args, **kwargs)

def error(msg, *args, **kwargs):
    logger.error(msg, *args, **kwargs)

def debug(msg, *args, **kwargs):
    logger.debug(msg, *args, **kwargs)

def critical(msg, *args, **kwargs):
    logger.critical(msg, *args, **kwargs)
