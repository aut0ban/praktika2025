from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
import werkzeug
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os
from functools import wraps

# Проверяем версию и импортируем соответствующим образом
if hasattr(werkzeug, '__version__') and werkzeug.__version__.startswith('3.'):
    # Для Werkzeug 3.0+
    from werkzeug.http import url_decode
    # Создаем псевдо-модуль для обратной совместимости
    import sys
    class UrlsModule:
        url_decode = url_decode
    sys.modules['werkzeug.urls'] = UrlsModule()
else:
    # Для Werkzeug 2.x
    from werkzeug.urls import url_decode

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production-1234567890'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///vetclinic.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Пожалуйста, войдите в систему для доступа к этой странице'
# Модели БД
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='client')
    full_name = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    appointments = db.relationship('Appointment', backref='client', lazy=True)

class Article(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50))
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    image_url = db.Column(db.String(300))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_published = db.Column(db.Boolean, default=True)
    views = db.Column(db.Integer, default=0)

class News(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_published = db.Column(db.Boolean, default=True)

class Service(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float)
    category = db.Column(db.String(50))
    duration = db.Column(db.String(20))

class Doctor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    specialization = db.Column(db.String(100))
    experience = db.Column(db.Integer)
    education = db.Column(db.Text)
    bio = db.Column(db.Text)
    photo_url = db.Column(db.String(300))
    schedule = db.Column(db.Text)

class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctor.id'))
    service_id = db.Column(db.Integer, db.ForeignKey('service.id'))
    pet_name = db.Column(db.String(50))
    pet_species = db.Column(db.String(30))
    pet_age = db.Column(db.Integer)
    date_time = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='pending')
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    doctor = db.relationship('Doctor', backref='appointments')
    service = db.relationship('Service', backref='appointments')
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Декораторы для проверки ролей
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or current_user.role != 'admin':
            flash('Требуются права администратора', 'danger')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def staff_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or current_user.role not in ['admin', 'staff']:
            flash('Требуются права сотрудника', 'danger')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Контекстный процессор - добавляет переменные во все шаблоны
@app.context_processor
def inject_base_template():
    # Проверяем, какой стиль использовать
    style = session.get('style', 'default')
    accessible = session.get('accessible', False)
    
    if style == 'accessible' or accessible:
        base_template = 'layout_accessible.html'
        is_accessible = True
    else:
        base_template = 'layout.html'
        is_accessible = False
    
    return dict(
        base_template=base_template,
        is_accessible=is_accessible,
        current_style=style
    )

# Основные маршруты
@app.route('/')
def index():
    news = News.query.filter_by(is_published=True).order_by(News.created_at.desc()).limit(3).all()
    services = Service.query.limit(3).all()
    doctors = Doctor.query.limit(3).all()
    return render_template('index.html', news=news, services=services, doctors=doctors)

@app.route('/services')
def services():
    services_list = Service.query.all()
    categories = db.session.query(Service.category).distinct().all()
    return render_template('services.html', services=services_list, categories=categories)

@app.route('/doctors')
def doctors():
    doctors_list = Doctor.query.all()
    specializations = db.session.query(Doctor.specialization).distinct().all()
    return render_template('doctors.html', doctors=doctors_list, specializations=specializations)
@app.route('/articles')
def articles():
    articles_list = Article.query.filter_by(is_published=True).order_by(Article.created_at.desc()).all()
    
    # Получаем уникальные категории из статей
    categories_query = db.session.query(Article.category).filter(Article.category.isnot(None)).distinct().all()
    categories = [cat[0] for cat in categories_query if cat[0]]  # Извлекаем строки из кортежей
    
    return render_template('articles.html', articles=articles_list, categories=categories)

@app.route('/article/<int:article_id>')
def article_detail(article_id):
    article = Article.query.get_or_404(article_id)
    article.views += 1
    db.session.commit()
    
    # Похожие статьи
    similar_articles = Article.query.filter(
        Article.category == article.category,
        Article.id != article.id,
        Article.is_published == True
    ).limit(3).all()
    
    return render_template('article_detail.html', article=article, similar_articles=similar_articles)
    
@app.route('/articles/category/<category_name>')
def articles_by_category(category_name):
    # Получаем статьи по категории
    articles_list = Article.query.filter_by(
        category=category_name, 
        is_published=True
    ).order_by(Article.created_at.desc()).all()
    
    # Получаем все категории для фильтра
    all_categories = db.session.query(Article.category).distinct().all()
    categories = [cat[0] for cat in all_categories if cat[0] is not None]
    
    return render_template('articles.html', 
                          articles=articles_list, 
                          categories=categories,
                          selected_category=category_name)
                          
@app.route('/contacts', methods=['GET', 'POST'])
def contacts():
    if request.method == 'POST':
        name = request.form.get('name')
        phone = request.form.get('phone')
        email = request.form.get('email')
        message = request.form.get('message')
        
        # Здесь можно добавить отправку email или сохранение в БД
        flash('Ваше сообщение отправлено! Мы свяжемся с вами в ближайшее время.', 'success')
        return redirect(url_for('contacts'))
    
    return render_template('contacts.html')

@app.route('/news')
def news():
    news_list = News.query.filter_by(is_published=True).order_by(News.created_at.desc()).all()
    return render_template('news.html', news=news_list)

@app.route('/profile')
@login_required
def profile():
    if current_user.role == 'client':
        appointments = Appointment.query.filter_by(client_id=current_user.id).order_by(Appointment.date_time.desc()).all()
        return render_template('profile.html', appointments=appointments)
    elif current_user.role in ['staff', 'admin']:
        # Для сотрудников и администраторов
        today = datetime.today().date()
        appointments = Appointment.query.filter(
            Appointment.date_time >= datetime.combine(today, datetime.min.time()),
            Appointment.date_time <= datetime.combine(today, datetime.max.time())
        ).order_by(Appointment.date_time).all()
        
        if current_user.role == 'admin':
            users_count = User.query.count()
            appointments_count = Appointment.query.count()
            users = User.query.order_by(User.created_at.desc()).all()
            return render_template('admin_panel.html', 
                                 appointments=appointments,
                                 users_count=users_count,
                                 appointments_count=appointments_count,
                                 users=users)
        
        return render_template('profile.html', appointments=appointments)
              
@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('profile'))
    
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        remember = True if request.form.get('remember') else False
        
        user = User.query.filter_by(email=email).first()
        
        if user and check_password_hash(user.password_hash, password):
            login_user(user, remember=remember)
            next_page = request.args.get('next')
            return redirect(next_page or url_for('profile'))
        else:
            flash('Неверный email или пароль', 'danger')
    
    return render_template('auth/login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('profile'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        full_name = request.form.get('full_name')
        phone = request.form.get('phone')
        
        if password != confirm_password:
            flash('Пароли не совпадают', 'danger')
            return redirect(url_for('register'))
        
        if User.query.filter_by(email=email).first():
            flash('Пользователь с таким email уже существует', 'danger')
            return redirect(url_for('register'))
        
        if User.query.filter_by(username=username).first():
            flash('Пользователь с таким именем уже существует', 'danger')
            return redirect(url_for('register'))
        
        new_user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password),
            full_name=full_name,
            phone=phone,
            role='client'
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        flash('Регистрация успешно завершена! Теперь вы можете войти.', 'success')
        return redirect(url_for('login'))
    
    return render_template('auth/register.html')

@app.route('/register-staff', methods=['GET', 'POST'])
@admin_required
def register_staff():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        full_name = request.form.get('full_name')
        phone = request.form.get('phone')
        role = request.form.get('role', 'staff')
        
        new_user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password),
            full_name=full_name,
            phone=phone,
            role=role
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        flash(f'Сотрудник {full_name} успешно зарегистрирован', 'success')
        return redirect(url_for('profile'))
    
    return render_template('auth/register_staff.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/make-appointment', methods=['POST'])
@login_required
def make_appointment():
    doctor_id = request.form.get('doctor_id')
    service_id = request.form.get('service_id')
    pet_name = request.form.get('pet_name')
    pet_species = request.form.get('pet_species')
    pet_age = request.form.get('pet_age')
    appointment_date = request.form.get('appointment_date')
    appointment_time = request.form.get('appointment_time')
    notes = request.form.get('notes')
    
    try:
        date_time = datetime.strptime(f'{appointment_date} {appointment_time}', '%Y-%m-%d %H:%M')
        
        appointment = Appointment(
            client_id=current_user.id,
            doctor_id=doctor_id,
            service_id=service_id,
            pet_name=pet_name,
            pet_species=pet_species,
            pet_age=pet_age,
            date_time=date_time,
            notes=notes,
            status='pending'
        )
        
        db.session.add(appointment)
        db.session.commit()
        
        flash('Запись успешно создана! Ожидайте подтверждения от клиники.', 'success')
    except Exception as e:
        flash(f'Ошибка при создании записи: {str(e)}', 'danger')
    
    return redirect(url_for('contacts'))

@app.route('/search')
def search():
    query = request.args.get('q', '')
    if query:
        articles = Article.query.filter(
            (Article.title.contains(query)) | 
            (Article.content.contains(query))
        ).filter_by(is_published=True).all()
        
        news_items = News.query.filter(
            (News.title.contains(query)) | 
            (News.content.contains(query))
        ).filter_by(is_published=True).all()
        
        services = Service.query.filter(
            Service.name.contains(query) | 
            Service.description.contains(query)
        ).all()
    else:
        articles = []
        news_items = []
        services = []
    
    return render_template('search_results.html', 
                         query=query, 
                         articles=articles, 
                         news=news_items, 
                         services=services)

@app.route('/switch-style/<style_name>')
def switch_style(style_name):
    session['style'] = style_name
    return redirect(request.referrer or url_for('index'))

@app.route('/sitemap')
def sitemap():
    return render_template('sitemap.html')

@app.route('/toggle-accessible')
def toggle_accessible():
    if 'accessible' not in session:
        session['accessible'] = True
        session['style'] = 'accessible'  # Добавляем это
    else:
        session['accessible'] = not session['accessible']
        if session['accessible']:
            session['style'] = 'accessible'
        else:
            session['style'] = 'default'  # или удаляем session['style']
    return redirect(request.referrer or url_for('index'))

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

# API для получения данных (для AJAX)
@app.route('/api/doctors')
def api_doctors():
    doctors = Doctor.query.all()
    result = []
    for doctor in doctors:
        result.append({
            'id': doctor.id,
            'name': doctor.name,
            'specialization': doctor.specialization,
            'photo_url': doctor.photo_url
        })
    return jsonify(result)

@app.route('/api/services')
def api_services():
    services = Service.query.all()
    result = []
    for service in services:
        result.append({
            'id': service.id,
            'name': service.name,
            'category': service.category,
            'price': service.price
        })
    return jsonify(result)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        
        # Создаем администратора по умолчанию, если его нет
        if not User.query.filter_by(role='admin').first():
            admin = User(
                username='admin',
                email='admin@vetclinic.ru',
                password_hash=generate_password_hash('admin123'),
                full_name='Администратор Системы',
                role='admin'
            )
            db.session.add(admin)
            db.session.commit()
            print("Создан администратор по умолчанию: admin@vetclinic.ru / admin123")
        if not User.query.filter_by(role='staff').first():
            staff = User(
                username='vet_doctor',
                email='doctor@vetclinic.ru',
                password_hash=generate_password_hash('doctor123'),
                full_name='Иванова Анна Сергеевна',
                role='staff'
            )
            db.session.add(staff)
            db.session.commit()
            print("Создан сотрудник по умолчанию: doctor@vetclinic.ru / doctor123")           
        if not User.query.filter_by(role='client').first():
            client = User(
                username='pet_lover',
                email='client@example.ru',
                password_hash=generate_password_hash('client123'),
                full_name='Петров Иван Иванович',
                role='client'
            )                 
            db.session.add(client)
            db.session.commit()         
            print("Создан клиент по умолчанию: client@example.ru / client123")
        
        # Создаем тестовые статьи, если их нет
        if Article.query.count() == 0:
            print("Создание тестовых статей...")
            
            # Находим администратора для использования в качестве автора
            admin_user = User.query.filter_by(role='admin').first()
            
            test_articles = [
                Article(
                    title='Как правильно ухаживать за зубами собаки',
                    content='''Регулярный уход за зубами собаки — залог ее здоровья и долголетия. 
                    Чистка зубов предотвращает образование зубного камня, воспаление десен и потерю зубов. 
                    Используйте специальные зубные щетки и пасты для собак. 
                    Приучайте питомца к процедуре постепенно, начиная с коротких сеансов. 
                    Также можно давать специальные лакомства и игрушки для чистки зубов. 
                    Регулярно посещайте ветеринара-стоматолога для профессиональной чистки.''',
                    category='Уход',
                    author_id=admin_user.id if admin_user else 1,
                    image_url='images/articles/dental_care.jpg',
                    views=156,
                    created_at=datetime.utcnow(),
                    is_published=True
                ),
                Article(
                    title='Вакцинация щенков: полный график прививок',
                    content='''Вакцинация — важнейшая часть заботы о здоровье щенка. 
                    Первую прививку делают в 8-9 недель от чумы, парвовируса, лептоспироза и гепатита. 
                    В 12 недель — ревакцинация и прививка от бешенства. 
                    Далее ежегодно проводят ревакцинацию. Перед вакцинацией обязательна дегельминтизация. 
                    После прививки соблюдайте карантин 2 недели. 
                    Все прививки отмечайте в ветеринарном паспорте. 
                    Правильная вакцинация защитит вашего питомца от опасных заболеваний.''',
                    category='Вакцинация',
                    author_id=admin_user.id if admin_user else 1,
                    image_url='images/articles/vaccination.jpg',
                    views=234,
                    created_at=datetime.utcnow(),
                    is_published=True
                ),
                Article(
                    title='Питание кошек: правильный рацион',
                    content='''Правильное питание — основа здоровья вашей кошки. 
                    Рацион должен быть сбалансирован по белкам, жирам, углеводам, витаминам и минералам. 
                    Выбирайте качественные корма, соответствующие возрасту и состоянию здоровья. 
                    Не смешивайте натуральное питание и промышленные корма. 
                    Обеспечьте постоянный доступ к свежей воде. 
                    Избегайте кормления со стола. 
                    При признаках ожирения или недобора веса обратитесь к ветеринару для коррекции рациона.''',
                    category='Питание',
                    author_id=admin_user.id if admin_user else 1,
                    image_url='images/articles/cat_food.jpg',
                    views=189,
                    created_at=datetime.utcnow(),
                    is_published=True
                ),
                Article(
                    title='Признаки болезни у домашних животных',
                    content='''Важно уметь распознавать первые признаки болезни у питомца:
                    1. Изменение аппетита (отказ от еды или повышенный аппетит)
                    2. Вялость, сонливость, нежелание двигаться
                    3. Изменение поведения (агрессия, беспокойство)
                    4. Рвота, диарея, запор
                    5. Кашель, чихание, выделения из носа или глаз
                    6. Изменение веса (резкое похудение или набор веса)
                    7. Проблемы с мочеиспусканием
                    
                    При появлении этих симптомов немедленно обратитесь к ветеринару.''',
                    category='Здоровье',
                    author_id=admin_user.id if admin_user else 1,
                    image_url='images/articles/symptoms.jpg',
                    views=312,
                    created_at=datetime.utcnow(),
                    is_published=True
                ),
                Article(
                    title='Подготовка животного к операции',
                    content='''Правильная подготовка к операции минимизирует риски и ускоряет восстановление:
                    
                    Перед операцией:
                    1. Соблюдайте голодную диету 8-12 часов
                    2. Обеспечьте доступ к воде до последнего момента
                    3. Проведите необходимые обследования (анализы крови, УЗИ)
                    4. Сообщите врачу обо всех лекарствах, которые принимает питомец
                    
                    После операции:
                    1. Строго следуйте рекомендациям врача
                    2. Обеспечьте покой и комфортные условия
                    3. Следите за швом, предотвращайте его разлизывание
                    4. Давайте все назначенные препараты вовремя
                    5. Посещайте контрольные осмотры''',
                    category='Хирургия',
                    author_id=admin_user.id if admin_user else 1,
                    image_url='images/articles/surgery_prep.jpg',
                    views=198,
                    created_at=datetime.utcnow(),
                    is_published=True
                )
            ]
            
            for article in test_articles:
                db.session.add(article)
            
            db.session.commit()
            print(f"Создано {len(test_articles)} тестовых статей")
            
            # Также создадим тестовые новости
            if News.query.count() == 0:
                test_news = [
                    News(
                        title='Открытие нового отделения реабилитации',
                        content='Рады сообщить об открытии нового отделения реабилитации животных после операций и травм. Теперь у нас есть современное оборудование для физиотерапии и гидротерапии.',
                        author_id=admin_user.id if admin_user else 1,
                        created_at=datetime.utcnow(),
                        is_published=True
                    ),
                    News(
                        title='Акция на стерилизацию кошек',
                        content='С 1 по 30 апреля действует специальная цена на стерилизацию кошек. Запишитесь заранее, количество мест ограничено!',
                        author_id=admin_user.id if admin_user else 1,
                        created_at=datetime.utcnow(),
                        is_published=True
                    )
                ]
                
                for news_item in test_news:
                    db.session.add(news_item)
                
                db.session.commit()
                print("Созданы тестовые новости")
    
    app.run(debug=True)
    
    