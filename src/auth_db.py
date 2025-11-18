"""
User authentication database module
Handles user registration, login, and verification
"""
import sqlite3
import bcrypt
import os
import threading
from datetime import datetime
from contextlib import contextmanager
from queue import Queue, Empty
from functools import lru_cache
import json

# Database file location
DB_FILE = 'users.db'

# Connection pool for better performance
class ConnectionPool:
    """Simple SQLite connection pool to reduce connection overhead"""
    def __init__(self, db_file, pool_size=5):
        self.db_file = db_file
        self.pool_size = pool_size
        self.pool = Queue(maxsize=pool_size)
        self.lock = threading.Lock()
        self.total_connections = 0

    def get_connection(self):
        """Get a connection from the pool or create a new one"""
        try:
            # Try to get from pool without blocking
            conn = self.pool.get_nowait()
            return conn
        except Empty:
            # Pool empty, create new connection if under limit
            with self.lock:
                if self.total_connections < self.pool_size:
                    conn = sqlite3.connect(self.db_file, check_same_thread=False)
                    conn.row_factory = sqlite3.Row
                    self.total_connections += 1
                    return conn
            # Wait for available connection
            return self.pool.get()

    def return_connection(self, conn):
        """Return a connection to the pool"""
        try:
            self.pool.put_nowait(conn)
        except:
            # Pool full, close the connection
            conn.close()
            with self.lock:
                self.total_connections -= 1

# Global connection pool
_connection_pool = ConnectionPool(DB_FILE, pool_size=10)

# In-memory settings cache to reduce DB queries
_settings_cache = {}  # user_id -> (settings_dict, timestamp)
_settings_cache_lock = threading.Lock()

@contextmanager
def get_db():
    """Context manager for database connections using connection pool"""
    conn = _connection_pool.get_connection()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        _connection_pool.return_connection(conn)

def init_db():
    """Initialize the database with users and settings tables"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                verified INTEGER DEFAULT 0,
                tier TEXT DEFAULT 'guest',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id INTEGER PRIMARY KEY,
                settings_json TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS crawl_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                base_url TEXT,
                urls_crawled INTEGER DEFAULT 0,
                status TEXT DEFAULT 'running',
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS guest_crawls (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ip_address TEXT NOT NULL,
                crawl_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_guest_ip_time
            ON guest_crawls(ip_address, crawl_time)
        ''')

        # Add performance indexes for faster queries
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_users_username
            ON users(username)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_users_email
            ON users(email)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_crawl_history_user_id
            ON crawl_history(user_id, started_at)
        ''')

        # Add tier column to existing users table if it doesn't exist
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN tier TEXT DEFAULT 'guest'")
        except:
            pass  # Column already exists

        print("Database initialized successfully")

def hash_password(password):
    """Hash a password with bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password, password_hash):
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def create_user(username, email, password):
    """
    Create a new user account (unverified by default)
    Returns (success, message)
    """
    try:
        # Validate inputs
        if not username or not email or not password:
            return False, "All fields are required"

        if len(username) < 3:
            return False, "Username must be at least 3 characters"

        if len(password) < 8:
            return False, "Password must be at least 8 characters"

        if '@' not in email:
            return False, "Invalid email address"

        # Hash the password
        password_hash = hash_password(password)

        # Insert into database
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO users (username, email, password_hash, verified)
                VALUES (?, ?, ?, 0)
            ''', (username, email, password_hash))

        return True, "Registration successful! Please wait for admin verification."

    except sqlite3.IntegrityError as e:
        if 'username' in str(e):
            return False, "Username already exists"
        elif 'email' in str(e):
            return False, "Email already exists"
        else:
            return False, "Registration failed"
    except Exception as e:
        print(f"Registration error: {e}")
        return False, "An error occurred during registration"

def authenticate_user(username, password):
    """
    Authenticate a user login attempt
    Returns (success, message, user_data)
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, username, email, password_hash, verified, tier
                FROM users
                WHERE username = ?
            ''', (username,))

            user = cursor.fetchone()

            if not user:
                return False, "Invalid username or password", None

            # Check if password is correct
            if not verify_password(password, user['password_hash']):
                return False, "Invalid username or password", None

            # Check if user is verified
            if user['verified'] != 1:
                return False, "Account not verified yet. Please wait for admin approval.", None

            # Update last login time
            cursor.execute('''
                UPDATE users
                SET last_login = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (user['id'],))

            user_data = {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'tier': user['tier'] or 'guest'
            }

            return True, "Login successful", user_data

    except Exception as e:
        print(f"Authentication error: {e}")
        return False, "An error occurred during login", None

def get_user_by_id(user_id):
    """Get user information by ID"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, username, email, verified, created_at, last_login
                FROM users
                WHERE id = ?
            ''', (user_id,))

            user = cursor.fetchone()
            if user:
                return dict(user)
            return None

    except Exception as e:
        print(f"Error fetching user: {e}")
        return None

def get_all_users():
    """Get all users (for admin purposes)"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, username, email, verified, created_at, last_login
                FROM users
                ORDER BY created_at DESC
            ''')

            users = cursor.fetchall()
            return [dict(user) for user in users]

    except Exception as e:
        print(f"Error fetching users: {e}")
        return []

def verify_user(user_id):
    """Verify a user account (for admin purposes)"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('UPDATE users SET verified = 1 WHERE id = ?', (user_id,))
        return True, "User verified successfully"
    except Exception as e:
        print(f"Error verifying user: {e}")
        return False, str(e)

def save_user_settings(user_id, settings_dict):
    """Save settings for a user (stores as JSON)"""
    try:
        settings_json = json.dumps(settings_dict)
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO user_settings (user_id, settings_json, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                    settings_json = excluded.settings_json,
                    updated_at = CURRENT_TIMESTAMP
            ''', (user_id, settings_json))

        # Invalidate cache after save
        with _settings_cache_lock:
            if user_id in _settings_cache:
                del _settings_cache[user_id]

        return True, "Settings saved successfully"
    except Exception as e:
        print(f"Error saving user settings: {e}")
        return False, f"Failed to save settings: {str(e)}"

def get_user_settings(user_id):
    """Get settings for a user with in-memory caching (returns dict or None)"""
    # Check cache first
    with _settings_cache_lock:
        if user_id in _settings_cache:
            cached_settings, cached_time = _settings_cache[user_id]
            # Cache valid for 5 minutes
            if (datetime.now() - cached_time).total_seconds() < 300:
                return cached_settings.copy()  # Return copy to prevent external modification

    # Cache miss or expired - load from DB
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT settings_json
                FROM user_settings
                WHERE user_id = ?
            ''', (user_id,))

            result = cursor.fetchone()
            if result:
                settings = json.loads(result['settings_json'])
                # Update cache
                with _settings_cache_lock:
                    _settings_cache[user_id] = (settings, datetime.now())
                return settings
            return None
    except Exception as e:
        print(f"Error fetching user settings: {e}")
        return None

def delete_user_settings(user_id):
    """Delete settings for a user"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM user_settings WHERE user_id = ?', (user_id,))

        # Invalidate cache after delete
        with _settings_cache_lock:
            if user_id in _settings_cache:
                del _settings_cache[user_id]

        return True
    except Exception as e:
        print(f"Error deleting user settings: {e}")
        return False

def set_user_tier(user_id, tier):
    """Set tier for a user (guest, user, extra, admin)"""
    valid_tiers = ['guest', 'user', 'extra', 'admin']
    if tier not in valid_tiers:
        return False, f"Invalid tier. Must be one of: {', '.join(valid_tiers)}"

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('UPDATE users SET tier = ? WHERE id = ?', (tier, user_id))
        return True, f"User tier updated to {tier}"
    except Exception as e:
        print(f"Error setting user tier: {e}")
        return False, str(e)

def get_user_tier(user_id):
    """Get tier for a user"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT tier FROM users WHERE id = ?', (user_id,))
            result = cursor.fetchone()
            return result['tier'] if result else 'guest'
    except Exception as e:
        print(f"Error getting user tier: {e}")
        return 'guest'

def log_crawl_start(user_id, base_url):
    """Log when a user starts a crawl"""
    # Don't log crawls for guests (user_id = None)
    if user_id is None:
        return None

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO crawl_history (user_id, base_url, status)
                VALUES (?, ?, 'running')
            ''', (user_id, base_url))
            return cursor.lastrowid
    except Exception as e:
        print(f"Error logging crawl start: {e}")
        return None

def log_crawl_complete(crawl_id, urls_crawled, status='completed'):
    """Log when a crawl completes"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE crawl_history
                SET completed_at = CURRENT_TIMESTAMP,
                    urls_crawled = ?,
                    status = ?
                WHERE id = ?
            ''', (urls_crawled, status, crawl_id))
        return True
    except Exception as e:
        print(f"Error logging crawl complete: {e}")
        return False

def log_guest_crawl(ip_address):
    """Log a guest crawl by IP address"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO guest_crawls (ip_address)
                VALUES (?)
            ''', (ip_address,))
        return True
    except Exception as e:
        print(f"Error logging guest crawl: {e}")
        return False

def get_guest_crawls_last_24h(ip_address):
    """Get number of crawls from this IP in last 24 hours"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT COUNT(*) as count
                FROM guest_crawls
                WHERE ip_address = ?
                AND crawl_time >= datetime('now', '-24 hours')
            ''', (ip_address,))
            result = cursor.fetchone()
            return result['count'] if result else 0
    except Exception as e:
        print(f"Error getting guest crawl count: {e}")
        return 0

def get_crawls_last_24h(user_id):
    """Get number of crawls started by user in last 24 hours"""
    # For guests (user_id = None), use IP-based tracking instead
    if user_id is None:
        return 0  # Call get_guest_crawls_last_24h with IP instead

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT COUNT(*) as count
                FROM crawl_history
                WHERE user_id = ?
                AND started_at >= datetime('now', '-24 hours')
            ''', (user_id,))
            result = cursor.fetchone()
            return result['count'] if result else 0
    except Exception as e:
        print(f"Error getting crawl count: {e}")
        return 0

def get_user_crawl_history(user_id, limit=50):
    """Get crawl history for a user"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, base_url, started_at, completed_at, urls_crawled, status
                FROM crawl_history
                WHERE user_id = ?
                ORDER BY started_at DESC
                LIMIT ?
            ''', (user_id, limit))
            return [dict(row) for row in cursor.fetchall()]
    except Exception as e:
        print(f"Error getting crawl history: {e}")
        return []
