"""
URL validation and sanitization utilities
Prevents SSRF and injection attacks
"""
from urllib.parse import urlparse
import re

def is_valid_url(url):
    """
    Validate that a URL is safe to crawl

    Returns: (is_valid: bool, error_message: str)
    """
    if not url or not isinstance(url, str):
        return False, "URL must be a non-empty string"

    # Basic length check
    if len(url) > 2048:
        return False, "URL too long (max 2048 characters)"

    # Must start with http:// or https://
    if not url.startswith(('http://', 'https://')):
        return False, "URL must start with http:// or https://"

    try:
        parsed = urlparse(url)

        # Must have a valid scheme
        if parsed.scheme not in ('http', 'https'):
            return False, "Invalid URL scheme (must be http or https)"

        # Must have a netloc (domain)
        if not parsed.netloc:
            return False, "URL must have a valid domain"

        # Check for localhost/private IPs (SSRF protection)
        hostname = parsed.hostname
        if not hostname:
            return False, "Invalid hostname"

        hostname_lower = hostname.lower()

        # Block localhost
        if hostname_lower in ('localhost', '127.0.0.1', '0.0.0.0', '::1'):
            return False, "Cannot crawl localhost URLs"

        # Block private IP ranges
        if hostname_lower.startswith(('192.168.', '10.', '172.')):
            # More sophisticated check for 172.16-31
            if hostname_lower.startswith('172.'):
                parts = hostname_lower.split('.')
                if len(parts) >= 2 and parts[1].isdigit():
                    second_octet = int(parts[1])
                    if 16 <= second_octet <= 31:
                        return False, "Cannot crawl private IP addresses"
            else:
                return False, "Cannot crawl private IP addresses"

        # Block link-local addresses
        if hostname_lower.startswith('169.254.'):
            return False, "Cannot crawl link-local addresses"

        # Block invalid characters
        if re.search(r'[<>"\{\}\|\\^\[\]`]', url):
            return False, "URL contains invalid characters"

        return True, ""

    except Exception as e:
        return False, f"Invalid URL format: {str(e)}"

def sanitize_url(url):
    """
    Sanitize a URL by removing dangerous components

    Returns: sanitized URL string
    """
    if not url:
        return ""

    # Strip whitespace
    url = url.strip()

    # Remove javascript: and data: URIs
    if url.lower().startswith(('javascript:', 'data:', 'vbscript:', 'file:')):
        return ""

    # Remove any embedded credentials (user:pass@host)
    try:
        parsed = urlparse(url)
        if parsed.username or parsed.password:
            # Reconstruct without credentials
            netloc = parsed.hostname
            if parsed.port:
                netloc += f':{parsed.port}'
            url = f"{parsed.scheme}://{netloc}{parsed.path}"
            if parsed.query:
                url += f'?{parsed.query}'
            if parsed.fragment:
                url += f'#{parsed.fragment}'
    except:
        pass

    return url
