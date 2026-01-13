// =============================================
// LimpeJá - Backend API
// Node.js + Express + PostgreSQL
// =============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// =============================================
// CONFIGURAÇÃO
// =============================================

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do banco de dados
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'limpeja',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Chave secreta para JWT
const JWT_SECRET = process.env.JWT_SECRET || 'limpeja-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Taxa da plataforma (15%)
const PLATFORM_FEE = 0.15;

// =============================================
// MIDDLEWARES
// =============================================

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de 100 requests por IP
});
app.use('/api/', limiter);

// Middleware de autenticação
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const result = await pool.query(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Middleware para verificar role
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }
    next();
  };
};

// =============================================
// HELPERS
// =============================================

// Calcular preço do serviço
const calculatePrice = async (cleaningType, sizeM2) => {
  const result = await pool.query(
    'SELECT base_price_per_m2, minimum_price, estimated_time_per_m2_minutes FROM cleaning_prices WHERE cleaning_type = $1',
    [cleaningType]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Tipo de limpeza inválido');
  }

  const { base_price_per_m2, minimum_price, estimated_time_per_m2_minutes } = result.rows[0];
  
  const calculatedPrice = parseFloat(base_price_per_m2) * sizeM2;
  const basePrice = Math.max(calculatedPrice, parseFloat(minimum_price));
  const platformFee = basePrice * PLATFORM_FEE;
  const totalPrice = basePrice;
  const cleanerEarnings = basePrice - platformFee;
  const estimatedDuration = (parseFloat(estimated_time_per_m2_minutes) * sizeM2) / 60;

  return {
    basePrice: Math.round(basePrice * 100) / 100,
    platformFee: Math.round(platformFee * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
    cleanerEarnings: Math.round(cleanerEarnings * 100) / 100,
    estimatedDuration: Math.round(estimatedDuration * 10) / 10
  };
};

// Buscar faxineiras próximas
const findNearbyCleaners = async (lat, lng, radiusKm = 10, cleaningType = null) => {
  let query = `
    SELECT 
      cp.id,
      cp.full_name,
      cp.bio,
      cp.rating_avg,
      cp.total_reviews,
      cp.hourly_rate,
      u.profile_photo_url,
      ST_Distance(cl.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000 as distance_km,
      array_agg(DISTINCT cs.cleaning_type) as specialties
    FROM cleaner_profiles cp
    JOIN users u ON cp.user_id = u.id
    JOIN cleaner_locations cl ON cp.id = cl.cleaner_id
    LEFT JOIN cleaner_specialties cs ON cp.id = cs.cleaner_id
    WHERE cp.is_available = true 
      AND cp.is_verified = true 
      AND u.is_active = true
      AND ST_DWithin(cl.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3 * 1000)
  `;
  
  const params = [lng, lat, radiusKm];
  
  if (cleaningType) {
    query += ` AND EXISTS (SELECT 1 FROM cleaner_specialties WHERE cleaner_id = cp.id AND cleaning_type = $4)`;
    params.push(cleaningType);
  }
  
  query += `
    GROUP BY cp.id, u.profile_photo_url, cl.location
    ORDER BY distance_km ASC
    LIMIT 20
  `;

  const result = await pool.query(query, params);
  return result.rows;
};

// =============================================
// ROTAS DE AUTENTICAÇÃO
// =============================================

// Registro de usuário
app.post('/api/auth/register', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { email, password, phone, role, fullName, cpf, birthDate, hourlyRate } = req.body;

    // Validações básicas
    if (!email || !password || !role || !fullName) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    if (!['client', 'cleaner'].includes(role)) {
      return res.status(400).json({ error: 'Role inválido' });
    }

    if (role === 'cleaner' && (!cpf || !birthDate)) {
      return res.status(400).json({ error: 'CPF e data de nascimento são obrigatórios para faxineiras' });
    }

    // Verificar se email já existe
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    await client.query('BEGIN');

    // Criar usuário
    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, phone, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, role`,
      [email, passwordHash, phone, role]
    );
    const user = userResult.rows[0];

    // Criar perfil baseado no role
    if (role === 'client') {
      await client.query(
        `INSERT INTO client_profiles (user_id, full_name, cpf, birth_date) 
         VALUES ($1, $2, $3, $4)`,
        [user.id, fullName, cpf || null, birthDate || null]
      );
    } else {
      await client.query(
        `INSERT INTO cleaner_profiles (user_id, full_name, cpf, birth_date, hourly_rate) 
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, fullName, cpf, birthDate, hourlyRate || 100]
      );
    }

    await client.query('COMMIT');

    // Gerar token
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: { id: user.id, email: user.email, role: user.role },
      token
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const result = await pool.query(
      'SELECT id, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Conta desativada' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Atualizar último login
    await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Buscar perfil
    let profile = null;
    if (user.role === 'client') {
      const profileResult = await pool.query('SELECT * FROM client_profiles WHERE user_id = $1', [user.id]);
      profile = profileResult.rows[0];
    } else if (user.role === 'cleaner') {
      const profileResult = await pool.query('SELECT * FROM cleaner_profiles WHERE user_id = $1', [user.id]);
      profile = profileResult.rows[0];
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      user: { id: user.id, email: user.email, role: user.role },
      profile,
      token
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Perfil do usuário logado
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    let profile = null;
    
    if (req.user.role === 'client') {
      const result = await pool.query('SELECT * FROM client_profiles WHERE user_id = $1', [req.user.id]);
      profile = result.rows[0];
    } else if (req.user.role === 'cleaner') {
      const result = await pool.query('SELECT * FROM cleaner_profiles WHERE user_id = $1', [req.user.id]);
      profile = result.rows[0];
    }

    res.json({ user: req.user, profile });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// ROTAS DE ENDEREÇOS
// =============================================

// Listar endereços do usuário
app.get('/api/addresses', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, label, street, number, complement, neighborhood, city, state, zip_code, is_default, instructions,
       ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng
       FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar endereços:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar endereço
app.post('/api/addresses', authenticate, async (req, res) => {
  try {
    const { label, street, number, complement, neighborhood, city, state, zipCode, lat, lng, instructions, isDefault } = req.body;

    if (!street || !number || !neighborhood || !city || !state || !zipCode) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    // Se for padrão, remover padrão dos outros
    if (isDefault) {
      await pool.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    }

    const result = await pool.query(
      `INSERT INTO addresses (user_id, label, street, number, complement, neighborhood, city, state, zip_code, location, instructions, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ST_SetSRID(ST_MakePoint($10, $11), 4326)::geography, $12, $13)
       RETURNING *`,
      [req.user.id, label, street, number, complement, neighborhood, city, state, zipCode, lng, lat, instructions, isDefault || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar endereço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// ROTAS DE FAXINEIRAS
// =============================================

// Buscar faxineiras disponíveis
app.get('/api/cleaners', authenticate, async (req, res) => {
  try {
    const { lat, lng, radius, cleaningType } = req.query;

    if (!lat || !lng) {
      // Sem localização, retornar todas verificadas
      const result = await pool.query(`
        SELECT 
          cp.id, cp.full_name, cp.bio, cp.rating_avg, cp.total_reviews, cp.hourly_rate,
          u.profile_photo_url,
          array_agg(DISTINCT cs.cleaning_type) as specialties
        FROM cleaner_profiles cp
        JOIN users u ON cp.user_id = u.id
        LEFT JOIN cleaner_specialties cs ON cp.id = cs.cleaner_id
        WHERE cp.is_available = true AND cp.is_verified = true AND u.is_active = true
        GROUP BY cp.id, u.profile_photo_url
        ORDER BY cp.rating_avg DESC
        LIMIT 50
      `);
      return res.json(result.rows);
    }

    const cleaners = await findNearbyCleaners(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius) || 10,
      cleaningType
    );

    res.json(cleaners);
  } catch (error) {
    console.error('Erro ao buscar faxineiras:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Detalhes de uma faxineira
app.get('/api/cleaners/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const cleanerResult = await pool.query(`
      SELECT 
        cp.*, u.profile_photo_url, u.phone,
        array_agg(DISTINCT cs.cleaning_type) as specialties
      FROM cleaner_profiles cp
      JOIN users u ON cp.user_id = u.id
      LEFT JOIN cleaner_specialties cs ON cp.id = cs.cleaner_id
      WHERE cp.id = $1
      GROUP BY cp.id, u.profile_photo_url, u.phone
    `, [id]);

    if (cleanerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Faxineira não encontrada' });
    }

    // Buscar avaliações
    const reviewsResult = await pool.query(`
      SELECT cr.*, c.full_name as client_name
      FROM cleaner_reviews cr
      JOIN client_profiles c ON cr.client_id = c.id
      WHERE cr.cleaner_id = $1 AND cr.is_public = true
      ORDER BY cr.created_at DESC
      LIMIT 10
    `, [id]);

    res.json({
      ...cleanerResult.rows[0],
      reviews: reviewsResult.rows
    });
  } catch (error) {
    console.error('Erro ao buscar faxineira:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar localização da faxineira
app.post('/api/cleaners/location', authenticate, requireRole('cleaner'), async (req, res) => {
  try {
    const { lat, lng } = req.body;

    // Buscar cleaner_id do perfil
    const profileResult = await pool.query('SELECT id FROM cleaner_profiles WHERE user_id = $1', [req.user.id]);
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }

    const cleanerId = profileResult.rows[0].id;

    await pool.query(`
      INSERT INTO cleaner_locations (cleaner_id, location, updated_at)
      VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, CURRENT_TIMESTAMP)
      ON CONFLICT (cleaner_id) DO UPDATE SET
        location = ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
        updated_at = CURRENT_TIMESTAMP
    `, [cleanerId, lng, lat]);

    res.json({ message: 'Localização atualizada' });
  } catch (error) {
    console.error('Erro ao atualizar localização:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Alternar disponibilidade
app.patch('/api/cleaners/availability', authenticate, requireRole('cleaner'), async (req, res) => {
  try {
    const { isAvailable } = req.body;

    await pool.query(`
      UPDATE cleaner_profiles SET is_available = $1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
    `, [isAvailable, req.user.id]);

    res.json({ message: 'Disponibilidade atualizada', isAvailable });
  } catch (error) {
    console.error('Erro ao atualizar disponibilidade:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// ROTAS DE BOOKINGS
// =============================================

// Calcular preço de um serviço
app.post('/api/bookings/calculate', authenticate, async (req, res) => {
  try {
    const { cleaningType, sizeM2 } = req.body;
    const pricing = await calculatePrice(cleaningType, sizeM2);
    res.json(pricing);
  } catch (error) {
    console.error('Erro ao calcular preço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar booking (cliente)
app.post('/api/bookings', authenticate, requireRole('client'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { addressId, cleanerId, cleaningType, sizeM2, scheduledDate, scheduledTime, notes } = req.body;

    // Validações
    if (!addressId || !cleaningType || !sizeM2 || !scheduledDate || !scheduledTime) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    // Buscar client_id do perfil
    const profileResult = await client.query('SELECT id FROM client_profiles WHERE user_id = $1', [req.user.id]);
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }
    const clientId = profileResult.rows[0].id;

    // Verificar se endereço pertence ao usuário
    const addressResult = await client.query('SELECT id FROM addresses WHERE id = $1 AND user_id = $2', [addressId, req.user.id]);
    if (addressResult.rows.length === 0) {
      return res.status(400).json({ error: 'Endereço inválido' });
    }

    // Se faxineira específica, verificar disponibilidade
    if (cleanerId) {
      const cleanerResult = await client.query(
        'SELECT id FROM cleaner_profiles WHERE id = $1 AND is_available = true AND is_verified = true',
        [cleanerId]
      );
      if (cleanerResult.rows.length === 0) {
        return res.status(400).json({ error: 'Faxineira não disponível' });
      }
    }

    // Calcular preços
    const pricing = await calculatePrice(cleaningType, sizeM2);

    await client.query('BEGIN');

    // Criar booking
    const bookingResult = await client.query(`
      INSERT INTO bookings (
        client_id, cleaner_id, address_id, cleaning_type, property_size_m2,
        scheduled_date, scheduled_time, estimated_duration_hours,
        base_price, platform_fee, total_price, cleaner_earnings, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      clientId,
      cleanerId || null,
      addressId,
      cleaningType,
      sizeM2,
      scheduledDate,
      scheduledTime,
      pricing.estimatedDuration,
      pricing.basePrice,
      pricing.platformFee,
      pricing.totalPrice,
      pricing.cleanerEarnings,
      notes
    ]);

    const booking = bookingResult.rows[0];

    // Se faxineira específica, criar notificação
    if (cleanerId) {
      const cleanerUserResult = await client.query(
        'SELECT user_id FROM cleaner_profiles WHERE id = $1',
        [cleanerId]
      );
      
      await client.query(`
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES ($1, 'booking', 'Nova solicitação de limpeza', 'Você recebeu uma nova solicitação de serviço', $2)
      `, [cleanerUserResult.rows[0].user_id, JSON.stringify({ bookingId: booking.id })]);
    }

    await client.query('COMMIT');

    res.status(201).json(booking);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar booking:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

// Listar bookings do usuário
app.get('/api/bookings', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query;
    let params;

    if (req.user.role === 'client') {
      const profileResult = await pool.query('SELECT id FROM client_profiles WHERE user_id = $1', [req.user.id]);
      const clientId = profileResult.rows[0]?.id;

      query = `
        SELECT b.*, 
          cp.full_name as cleaner_name, cu.profile_photo_url as cleaner_photo,
          a.street, a.number, a.neighborhood
        FROM bookings b
        LEFT JOIN cleaner_profiles cp ON b.cleaner_id = cp.id
        LEFT JOIN users cu ON cp.user_id = cu.id
        JOIN addresses a ON b.address_id = a.id
        WHERE b.client_id = $1
      `;
      params = [clientId];
    } else {
      const profileResult = await pool.query('SELECT id FROM cleaner_profiles WHERE user_id = $1', [req.user.id]);
      const cleanerId = profileResult.rows[0]?.id;

      query = `
        SELECT b.*, 
          c.full_name as client_name, cu.profile_photo_url as client_photo,
          a.street, a.number, a.neighborhood, a.city
        FROM bookings b
        JOIN client_profiles c ON b.client_id = c.id
        JOIN users cu ON c.user_id = cu.id
        JOIN addresses a ON b.address_id = a.id
        WHERE b.cleaner_id = $1
      `;
      params = [cleanerId];
    }

    if (status) {
      query += ` AND b.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY b.scheduled_date DESC, b.scheduled_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar bookings:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Detalhes de um booking
app.get('/api/bookings/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT b.*, 
        c.full_name as client_name, cu.profile_photo_url as client_photo, cu.phone as client_phone,
        cp.full_name as cleaner_name, clu.profile_photo_url as cleaner_photo, clu.phone as cleaner_phone,
        a.street, a.number, a.complement, a.neighborhood, a.city, a.state, a.zip_code, a.instructions,
        ST_Y(a.location::geometry) as lat, ST_X(a.location::geometry) as lng
      FROM bookings b
      JOIN client_profiles c ON b.client_id = c.id
      JOIN users cu ON c.user_id = cu.id
      LEFT JOIN cleaner_profiles cp ON b.cleaner_id = cp.id
      LEFT JOIN users clu ON cp.user_id = clu.id
      JOIN addresses a ON b.address_id = a.id
      WHERE b.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar booking:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Aceitar booking (faxineira)
app.post('/api/bookings/:id/accept', authenticate, requireRole('cleaner'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    const profileResult = await client.query('SELECT id FROM cleaner_profiles WHERE user_id = $1', [req.user.id]);
    const cleanerId = profileResult.rows[0]?.id;

    await client.query('BEGIN');

    // Verificar se booking está pendente e disponível
    const bookingResult = await client.query(
      `SELECT * FROM bookings WHERE id = $1 AND status = 'pending' AND (cleaner_id IS NULL OR cleaner_id = $2) FOR UPDATE`,
      [id, cleanerId]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Booking não disponível para aceitar' });
    }

    // Atualizar booking
    await client.query(`
      UPDATE bookings SET 
        cleaner_id = $1, 
        status = 'accepted', 
        accepted_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [cleanerId, id]);

    // Notificar cliente
    const clientUserResult = await client.query(`
      SELECT u.id FROM users u
      JOIN client_profiles c ON u.id = c.user_id
      WHERE c.id = $1
    `, [bookingResult.rows[0].client_id]);

    await client.query(`
      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES ($1, 'booking', 'Limpeza confirmada!', 'Uma faxineira aceitou seu pedido', $2)
    `, [clientUserResult.rows[0].id, JSON.stringify({ bookingId: id })]);

    await client.query('COMMIT');

    res.json({ message: 'Booking aceito com sucesso' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao aceitar booking:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

// Iniciar serviço (faxineira)
app.post('/api/bookings/:id/start', authenticate, requireRole('cleaner'), async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng, photoUrl } = req.body;

    const profileResult = await pool.query('SELECT id FROM cleaner_profiles WHERE user_id = $1', [req.user.id]);
    const cleanerId = profileResult.rows[0]?.id;

    // Verificar se booking pertence à faxineira e está aceito
    const bookingResult = await pool.query(
      `SELECT * FROM bookings WHERE id = $1 AND cleaner_id = $2 AND status = 'accepted'`,
      [id, cleanerId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(400).json({ error: 'Booking não encontrado ou não pode ser iniciado' });
    }

    // Atualizar status
    await pool.query(`
      UPDATE bookings SET status = 'in_progress', started_at = CURRENT_TIMESTAMP WHERE id = $1
    `, [id]);

    // Registrar checkin
    await pool.query(`
      INSERT INTO booking_checkins (booking_id, checkin_time, checkin_location, checkin_photo_url)
      VALUES ($1, CURRENT_TIMESTAMP, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4)
    `, [id, lng, lat, photoUrl]);

    res.json({ message: 'Serviço iniciado' });
  } catch (error) {
    console.error('Erro ao iniciar serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Finalizar serviço (faxineira)
app.post('/api/bookings/:id/complete', authenticate, requireRole('cleaner'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { lat, lng, photoUrl } = req.body;

    const profileResult = await client.query('SELECT id FROM cleaner_profiles WHERE user_id = $1', [req.user.id]);
    const cleanerId = profileResult.rows[0]?.id;

    await client.query('BEGIN');

    // Verificar se booking está em progresso
    const bookingResult = await client.query(
      `SELECT * FROM bookings WHERE id = $1 AND cleaner_id = $2 AND status = 'in_progress' FOR UPDATE`,
      [id, cleanerId]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Booking não encontrado ou não pode ser finalizado' });
    }

    // Atualizar status
    await client.query(`
      UPDATE bookings SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = $1
    `, [id]);

    // Registrar checkout
    await client.query(`
      UPDATE booking_checkins SET 
        checkout_time = CURRENT_TIMESTAMP, 
        checkout_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
        checkout_photo_url = $3
      WHERE booking_id = $4
    `, [lng, lat, photoUrl, id]);

    // Criar transação de pagamento
    const booking = bookingResult.rows[0];
    await client.query(`
      INSERT INTO transactions (booking_id, amount, platform_fee, cleaner_amount, status)
      VALUES ($1, $2, $3, $4, 'pending')
    `, [id, booking.total_price, booking.platform_fee, booking.cleaner_earnings]);

    // Notificar cliente
    const clientUserResult = await client.query(`
      SELECT u.id FROM users u
      JOIN client_profiles c ON u.id = c.user_id
      WHERE c.id = $1
    `, [booking.client_id]);

    await client.query(`
      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES ($1, 'booking', 'Limpeza finalizada!', 'O serviço foi concluído. Por favor, confirme e avalie.', $2)
    `, [clientUserResult.rows[0].id, JSON.stringify({ bookingId: id })]);

    await client.query('COMMIT');

    res.json({ message: 'Serviço finalizado com sucesso' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao finalizar serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

// Cancelar booking
app.post('/api/bookings/:id/cancel', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const bookingResult = await pool.query(
      `SELECT * FROM bookings WHERE id = $1 AND status IN ('pending', 'accepted')`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(400).json({ error: 'Booking não pode ser cancelado' });
    }

    await pool.query(`
      UPDATE bookings SET 
        status = 'cancelled', 
        cancelled_at = CURRENT_TIMESTAMP,
        cancellation_reason = $1,
        cancelled_by = $2
      WHERE id = $3
    `, [reason, req.user.id, id]);

    res.json({ message: 'Booking cancelado' });
  } catch (error) {
    console.error('Erro ao cancelar booking:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// ROTAS DE AVALIAÇÕES
// =============================================

// Criar avaliação (cliente avalia faxineira)
app.post('/api/reviews/cleaner', authenticate, requireRole('client'), async (req, res) => {
  try {
    const { bookingId, rating, comment, punctualityRating, qualityRating, professionalismRating } = req.body;

    // Buscar client_id
    const profileResult = await pool.query('SELECT id FROM client_profiles WHERE user_id = $1', [req.user.id]);
    const clientId = profileResult.rows[0]?.id;

    // Verificar se booking existe e está completo
    const bookingResult = await pool.query(
      `SELECT * FROM bookings WHERE id = $1 AND client_id = $2 AND status = 'completed'`,
      [bookingId, clientId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(400).json({ error: 'Booking não encontrado ou não pode ser avaliado' });
    }

    // Verificar se já foi avaliado
    const existingReview = await pool.query(
      'SELECT id FROM cleaner_reviews WHERE booking_id = $1',
      [bookingId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(400).json({ error: 'Booking já foi avaliado' });
    }

    const booking = bookingResult.rows[0];

    await pool.query(`
      INSERT INTO cleaner_reviews (
        booking_id, client_id, cleaner_id, rating, comment,
        punctuality_rating, quality_rating, professionalism_rating
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [bookingId, clientId, booking.cleaner_id, rating, comment, punctualityRating, qualityRating, professionalismRating]);

    res.status(201).json({ message: 'Avaliação criada com sucesso' });
  } catch (error) {
    console.error('Erro ao criar avaliação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// ROTAS DE PAGAMENTOS
// =============================================

// Confirmar pagamento (cliente)
app.post('/api/payments/:bookingId/confirm', authenticate, requireRole('client'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { bookingId } = req.params;

    await client.query('BEGIN');

    // Buscar transação pendente
    const transactionResult = await client.query(
      `SELECT t.* FROM transactions t
       JOIN bookings b ON t.booking_id = b.id
       JOIN client_profiles c ON b.client_id = c.id
       WHERE t.booking_id = $1 AND c.user_id = $2 AND t.status = 'pending'
       FOR UPDATE`,
      [bookingId, req.user.id]
    );

    if (transactionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Transação não encontrada' });
    }

    // Simular processamento do pagamento (em produção, integrar com gateway)
    await client.query(`
      UPDATE transactions SET 
        status = 'completed', 
        paid_at = CURRENT_TIMESTAMP,
        provider = 'simulated'
      WHERE id = $1
    `, [transactionResult.rows[0].id]);

    // Atualizar checkin para confirmado
    await client.query(`
      UPDATE booking_checkins SET 
        client_confirmed = true, 
        client_confirmed_at = CURRENT_TIMESTAMP
      WHERE booking_id = $1
    `, [bookingId]);

    await client.query('COMMIT');

    res.json({ message: 'Pagamento confirmado' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao confirmar pagamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

// Listar ganhos (faxineira)
app.get('/api/earnings', authenticate, requireRole('cleaner'), async (req, res) => {
  try {
    const profileResult = await pool.query('SELECT id FROM cleaner_profiles WHERE user_id = $1', [req.user.id]);
    const cleanerId = profileResult.rows[0]?.id;

    // Ganhos do mês atual
    const monthEarnings = await pool.query(`
      SELECT 
        COALESCE(SUM(b.cleaner_earnings), 0) as total,
        COUNT(*) as bookings_count
      FROM bookings b
      WHERE b.cleaner_id = $1 
        AND b.status = 'completed'
        AND DATE_TRUNC('month', b.completed_at) = DATE_TRUNC('month', CURRENT_DATE)
    `, [cleanerId]);

    // Disponível para saque
    const availableResult = await pool.query(`
      SELECT COALESCE(SUM(t.cleaner_amount), 0) as available
      FROM transactions t
      JOIN bookings b ON t.booking_id = b.id
      WHERE b.cleaner_id = $1 
        AND t.status = 'completed'
        AND NOT EXISTS (
          SELECT 1 FROM payout_items pi WHERE pi.transaction_id = t.id
        )
    `, [cleanerId]);

    // Histórico de transações
    const transactions = await pool.query(`
      SELECT 
        t.id, t.cleaner_amount as amount, t.status, t.paid_at,
        b.cleaning_type, b.scheduled_date,
        c.full_name as client_name
      FROM transactions t
      JOIN bookings b ON t.booking_id = b.id
      JOIN client_profiles c ON b.client_id = c.id
      WHERE b.cleaner_id = $1
      ORDER BY t.created_at DESC
      LIMIT 20
    `, [cleanerId]);

    res.json({
      monthTotal: parseFloat(monthEarnings.rows[0].total),
      monthBookings: parseInt(monthEarnings.rows[0].bookings_count),
      availableForPayout: parseFloat(availableResult.rows[0].available),
      transactions: transactions.rows
    });
  } catch (error) {
    console.error('Erro ao buscar ganhos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// ROTAS DE NOTIFICAÇÕES
// =============================================

// Listar notificações
app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar notificação como lida
app.patch('/api/notifications/:id/read', authenticate, async (req, res) => {
  try {
    await pool.query(`
      UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.user.id]);

    res.json({ message: 'Notificação marcada como lida' });
  } catch (error) {
    console.error('Erro ao marcar notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// ROTAS DE CHAT
// =============================================

// Listar mensagens de um booking
app.get('/api/chat/:bookingId', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cm.*, u.email as sender_email
      FROM chat_messages cm
      JOIN users u ON cm.sender_id = u.id
      WHERE cm.booking_id = $1
      ORDER BY cm.created_at ASC
    `, [req.params.bookingId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Enviar mensagem
app.post('/api/chat/:bookingId', authenticate, async (req, res) => {
  try {
    const { message } = req.body;
    const { bookingId } = req.params;

    const result = await pool.query(`
      INSERT INTO chat_messages (booking_id, sender_id, message)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [bookingId, req.user.id, message]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// HEALTH CHECK
// =============================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// =============================================
// INICIAR SERVIDOR
// =============================================

app.listen(PORT, () => {
  console.log(`🚀 LimpeJá API rodando na porta ${PORT}`);
});

module.exports = app;