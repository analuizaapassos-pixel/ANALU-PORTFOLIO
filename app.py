import os
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Configurações do Banco de Dados e Uploads
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///portfolio.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'static', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limite de 16MB por arquivo

db = SQLAlchemy(app)

# Garante que a pasta de uploads exista
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# --- MODELOS DE BANCO DE DADOS ---

class Settings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    about_text = db.Column(db.Text, default="Olá! Eu sou a Analu...")
    profile_photo = db.Column(db.String(255), default="")

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    tags = db.Column(db.String(255))
    cover_url = db.Column(db.String(255), nullable=False)
    blocks = db.relationship('ProjectBlock', backref='project', cascade="all, delete-orphan", lazy=True)

class ProjectBlock(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    type = db.Column(db.String(20), nullable=False) # 'text' ou 'image'
    content = db.Column(db.Text, nullable=False)

# Cria o banco na primeira execução
with app.app_context():
    db.create_all()
    # Cria configurações iniciais se não existirem
    if not Settings.query.first():
        db.session.add(Settings())
        db.session.commit()

# --- UTILITÁRIOS ---
def check_token(req):
    # Simulação simples de token. Em produção, use JWT.
    auth_header = req.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        return token == 'analu_token_secreto_123'
    return False

# --- ROTAS DA API ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    # Usuário e senha fixos para o seu acesso único
    if data.get('username') == 'analu' and data.get('password') == 'design2026':
        return jsonify({"token": "analu_token_secreto_123"})
    return jsonify({"error": "Credenciais inválidas"}), 401

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if not check_token(request): return jsonify({'error': 'Não autorizado'}), 401
    
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Nome de arquivo vazio'}), 400
        
    if file:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        # Retorna a URL pública do arquivo
        return jsonify({'url': f'/static/uploads/{filename}'})

@app.route('/static/uploads/<filename>')
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/settings', methods=['GET', 'PUT'])
def handle_settings():
    settings = Settings.query.first()
    
    if request.method == 'GET':
        return jsonify({
            "about_text": settings.about_text,
            "profile_photo": settings.profile_photo
        })
        
    if request.method == 'PUT':
        if not check_token(request): return jsonify({'error': 'Não autorizado'}), 401
        data = request.get_json()
        settings.about_text = data.get('about_text', settings.about_text)
        settings.profile_photo = data.get('profile_photo', settings.profile_photo)
        db.session.commit()
        return jsonify({"success": True})

@app.route('/api/projects', methods=['GET', 'POST'])
def handle_projects():
    if request.method == 'GET':
        projects = Project.query.all()
        result = []
        for p in projects:
            result.append({
                "id": p.id,
                "title": p.title,
                "category": p.category,
                "tags": p.tags,
                "cover_url": p.cover_url
            })
        return jsonify(result)
        
    if request.method == 'POST':
        if not check_token(request): return jsonify({'error': 'Não autorizado'}), 401
        data = request.get_json()
        
        new_project = Project(
            title=data.get('title'),
            category=data.get('category'),
            tags=data.get('tags'),
            cover_url=data.get('cover_url')
        )
        db.session.add(new_project)
        db.session.flush() # Pega o ID antes de commitar os blocos
        
        blocks_data = data.get('blocks', [])
        for block in blocks_data:
            new_block = ProjectBlock(project_id=new_project.id, type=block['type'], content=block['content'])
            db.session.add(new_block)
            
        db.session.commit()
        return jsonify({"success": True, "id": new_project.id})

@app.route('/api/projects/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def handle_single_project(id):
    project = Project.query.get_or_404(id)
    
    if request.method == 'GET':
        blocks = [{"type": b.type, "content": b.content} for b in project.blocks]
        return jsonify({
            "id": project.id,
            "title": project.title,
            "category": project.category,
            "tags": project.tags,
            "cover_url": project.cover_url,
            "blocks": blocks
        })
        
    if request.method == 'DELETE':
        if not check_token(request): return jsonify({'error': 'Não autorizado'}), 401
        db.session.delete(project)
        db.session.commit()
        return jsonify({"success": True})
        
    if request.method == 'PUT':
        if not check_token(request): return jsonify({'error': 'Não autorizado'}), 401
        data = request.get_json()
        
        project.title = data.get('title', project.title)
        project.category = data.get('category', project.category)
        project.tags = data.get('tags', project.tags)
        project.cover_url = data.get('cover_url', project.cover_url)
        
        # Atualiza blocos (deleta antigos e insere novos)
        ProjectBlock.query.filter_by(project_id=project.id).delete()
        blocks_data = data.get('blocks', [])
        for block in blocks_data:
            new_block = ProjectBlock(project_id=project.id, type=block['type'], content=block['content'])
            db.session.add(new_block)
            
        db.session.commit()
        return jsonify({"success": True})

@app.route('/api/contato', methods=['POST'])
def contato():
    data = request.get_json()
    print(f"Nova mensagem de: {data.get('nome')} | Email: {data.get('email')}")
    return jsonify({"success": True, "message": "Mensagem enviada com sucesso!"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)