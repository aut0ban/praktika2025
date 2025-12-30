"""
Файл для хранения расширений Flask
"""
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

# Создаем экземпляры расширений без приложения
db = SQLAlchemy()
login_manager = LoginManager()
login_manager.login_view = 'login'
login_manager.login_message = 'Пожалуйста, войдите в систему для доступа к этой странице'