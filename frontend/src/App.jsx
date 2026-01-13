import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, MapPin, Clock, Star, Check, X, Home, User, Calendar,
  CreditCard, Bell, Settings, LogOut, Search, Filter, ChevronRight,
  Phone, Mail, Shield, Award, TrendingUp, DollarSign, CheckCircle,
  XCircle, AlertCircle, Camera, Edit, Plus, Minus, Navigation,
  MessageCircle, Heart, Zap, Coffee, Droplets, Wind, Sun, Moon
} from 'lucide-react';

// ==================== DADOS MOCKADOS ====================
const mockCleaners = [
  { id: 1, name: 'Maria Silva', photo: '👩🏽', rating: 4.9, reviews: 127, price: 120, distance: '1.2km', available: true, verified: true, specialties: ['Residencial', 'Pós-obra'] },
  { id: 2, name: 'Ana Santos', photo: '👩🏻', rating: 4.8, reviews: 89, price: 110, distance: '2.1km', available: true, verified: true, specialties: ['Residencial', 'Comercial'] },
  { id: 3, name: 'Joana Costa', photo: '👩🏾', rating: 4.7, reviews: 64, price: 100, distance: '3.5km', available: false, verified: true, specialties: ['Residencial'] },
  { id: 4, name: 'Lucia Oliveira', photo: '👩🏼', rating: 4.9, reviews: 203, price: 140, distance: '0.8km', available: true, verified: true, specialties: ['Premium', 'Residencial'] },
];

const mockRequests = [
  { id: 1, client: 'Carlos M.', address: 'Rua das Flores, 123', type: 'Limpeza Completa', size: '80m²', price: 150, status: 'pending', time: '14:00', date: 'Hoje' },
  { id: 2, client: 'Patricia S.', address: 'Av. Brasil, 456', type: 'Limpeza Básica', size: '60m²', price: 100, status: 'pending', time: '16:30', date: 'Hoje' },
  { id: 3, client: 'Roberto L.', address: 'Rua Nova, 789', type: 'Pós-obra', size: '120m²', price: 280, status: 'pending', time: '09:00', date: 'Amanhã' },
];

const mockHistory = [
  { id: 1, cleaner: 'Maria Silva', date: '10/01/2026', type: 'Limpeza Completa', price: 150, status: 'completed', rating: 5 },
  { id: 2, cleaner: 'Ana Santos', date: '05/01/2026', type: 'Limpeza Básica', price: 100, status: 'completed', rating: 4 },
  { id: 3, cleaner: 'Maria Silva', date: '28/12/2025', type: 'Limpeza Completa', price: 150, status: 'completed', rating: 5 },
];

// ==================== COMPONENTES BASE ====================
const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const slideIn = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' }
};

const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50',
    secondary: 'bg-white/10 text-white border border-white/20 hover:bg-white/20',
    outline: 'border-2 border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white',
    ghost: 'text-emerald-400 hover:bg-emerald-500/10',
    danger: 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/30',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-8 py-4 text-lg',
  };
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`font-semibold rounded-xl transition-all duration-300 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};

const Card = ({ children, className = '', hover = true, ...props }) => (
  <motion.div
    whileHover={hover ? { y: -4, scale: 1.01 } : {}}
    className={`bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 ${className}`}
    {...props}
  >
    {children}
  </motion.div>
);

const Input = ({ icon: Icon, label, className = '', ...props }) => (
  <div className="space-y-2">
    {label && <label className="text-sm text-slate-400 font-medium">{label}</label>}
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
      )}
      <input
        className={`w-full bg-slate-800/50 border border-white/10 rounded-xl py-3 ${Icon ? 'pl-12' : 'pl-4'} pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all ${className}`}
        {...props}
      />
    </div>
  </div>
);

const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-slate-700 text-slate-300',
    success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
    info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  };
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

// ==================== TELA DE LOGIN/REGISTRO ====================
const AuthScreen = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState('client');
  const [formData, setFormData] = useState({ email: '', password: '', name: '', phone: '', cpf: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(userType);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-teal-500/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-teal-400 rounded-full animate-pulse delay-300" />
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-emerald-300 rounded-full animate-pulse delay-700" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <motion.div 
          initial={{ y: -30 }}
          animate={{ y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              LimpeJá
            </h1>
          </div>
          <p className="text-slate-400">Limpeza profissional ao seu alcance</p>
        </motion.div>

        <Card className="p-8" hover={false}>
          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-slate-800/50 p-1 rounded-xl">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-lg font-semibold transition-all ${isLogin ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Entrar
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-lg font-semibold transition-all ${!isLogin ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Cadastrar
            </button>
          </div>

          {/* User Type Selection */}
          <div className="flex gap-3 mb-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setUserType('client')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${userType === 'client' ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 hover:border-white/30'}`}
            >
              <Home className={`w-6 h-6 mx-auto mb-2 ${userType === 'client' ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className={`text-sm font-medium ${userType === 'client' ? 'text-emerald-400' : 'text-slate-400'}`}>
                Sou Cliente
              </span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setUserType('cleaner')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${userType === 'cleaner' ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 hover:border-white/30'}`}
            >
              <Sparkles className={`w-6 h-6 mx-auto mb-2 ${userType === 'cleaner' ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className={`text-sm font-medium ${userType === 'cleaner' ? 'text-emerald-400' : 'text-slate-400'}`}>
                Sou Faxineira
              </span>
            </motion.button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div {...fadeIn} className="space-y-4">
                  <Input
                    icon={User}
                    label="Nome completo"
                    placeholder="Seu nome"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                  <Input
                    icon={Phone}
                    label="Telefone"
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                  {userType === 'cleaner' && (
                    <Input
                      icon={Shield}
                      label="CPF"
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <Input
              icon={Mail}
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
            <Input
              icon={Shield}
              label="Senha"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />

            {isLogin && (
              <div className="text-right">
                <button type="button" className="text-sm text-emerald-400 hover:underline">
                  Esqueci minha senha
                </button>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg">
              {isLogin ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>

          {/* Social Login */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-center text-slate-500 text-sm mb-4">ou continue com</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1">Google</Button>
              <Button variant="secondary" className="flex-1">Apple</Button>
            </div>
          </div>
        </Card>

        <p className="text-center text-slate-500 text-sm mt-6">
          Ao continuar, você concorda com nossos{' '}
          <a href="#" className="text-emerald-400 hover:underline">Termos</a> e{' '}
          <a href="#" className="text-emerald-400 hover:underline">Privacidade</a>
        </p>
      </motion.div>
    </div>
  );
};

// ==================== DASHBOARD DO CLIENTE ====================
const ClientDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [showBooking, setShowBooking] = useState(false);
  const [selectedCleaner, setSelectedCleaner] = useState(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    type: 'complete',
    size: 80,
    date: '',
    time: '',
    address: '',
    notes: ''
  });

  const cleaningTypes = [
    { id: 'basic', name: 'Limpeza Básica', icon: Droplets, price: 80, desc: 'Varrer, passar pano, limpar banheiro' },
    { id: 'complete', name: 'Limpeza Completa', icon: Sparkles, price: 120, desc: 'Básica + cozinha, quartos, áreas' },
    { id: 'deep', name: 'Limpeza Pesada', icon: Zap, price: 180, desc: 'Completa + dentro de armários, janelas' },
    { id: 'post-construction', name: 'Pós-obra', icon: Wind, price: 250, desc: 'Remoção de resíduos de construção' },
  ];

  const calculatePrice = () => {
    const basePrice = cleaningTypes.find(t => t.id === bookingData.type)?.price || 120;
    const sizeMultiplier = bookingData.size / 60;
    return Math.round(basePrice * sizeMultiplier);
  };

  // Header Component
  const Header = () => (
    <header className="bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">LimpeJá</span>
        </div>
        <div className="flex items-center gap-4">
          <motion.button whileHover={{ scale: 1.1 }} className="relative">
            <Bell className="w-6 h-6 text-slate-400 hover:text-white transition-colors" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">2</span>
          </motion.button>
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-xl">
            👤
          </div>
        </div>
      </div>
    </header>
  );

  // Navigation Component
  const Navigation = () => (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 z-50">
      <div className="max-w-lg mx-auto px-4 py-2 flex justify-around">
        {[
          { id: 'home', icon: Home, label: 'Início' },
          { id: 'history', icon: Calendar, label: 'Histórico' },
          { id: 'payments', icon: CreditCard, label: 'Pagamentos' },
          { id: 'profile', icon: User, label: 'Perfil' },
        ].map(item => (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${activeTab === item.id ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-xs font-medium">{item.label}</span>
          </motion.button>
        ))}
      </div>
    </nav>
  );

  // Home Tab
  const HomeTab = () => (
    <div className="space-y-6">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-2">Olá, Carlos! 👋</h2>
          <p className="text-emerald-100 mb-4">Sua casa merece o melhor cuidado</p>
          <Button 
            variant="secondary" 
            className="bg-white text-emerald-600 hover:bg-emerald-50"
            onClick={() => setShowBooking(true)}
          >
            <Plus className="w-5 h-5 mr-2 inline" />
            Agendar Limpeza
          </Button>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: Droplets, label: 'Básica', color: 'from-blue-500 to-cyan-500' },
          { icon: Sparkles, label: 'Completa', color: 'from-emerald-500 to-teal-500' },
          { icon: Zap, label: 'Pesada', color: 'from-amber-500 to-orange-500' },
          { icon: Wind, label: 'Pós-obra', color: 'from-purple-500 to-pink-500' },
        ].map((item, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setBookingData({...bookingData, type: item.label.toLowerCase()});
              setShowBooking(true);
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-800/50 border border-white/10 hover:border-white/30 transition-all"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
              <item.icon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-slate-400 font-medium">{item.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Available Cleaners */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Faxineiras Disponíveis</h3>
          <button className="text-emerald-400 text-sm font-medium hover:underline">Ver todas</button>
        </div>
        <div className="space-y-3">
          {mockCleaners.filter(c => c.available).map((cleaner, i) => (
            <motion.div
              key={cleaner.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card 
                className="p-4 cursor-pointer"
                onClick={() => {
                  setSelectedCleaner(cleaner);
                  setShowBooking(true);
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center text-2xl">
                    {cleaner.photo}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white">{cleaner.name}</h4>
                      {cleaner.verified && (
                        <Shield className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        {cleaner.rating}
                      </span>
                      <span>({cleaner.reviews} avaliações)</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {cleaner.distance}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-bold">R$ {cleaner.price}</p>
                    <p className="text-xs text-slate-500">/hora</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {cleaner.specialties.map(s => (
                    <Badge key={s} variant="success">{s}</Badge>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Active Booking */}
      <Card className="p-4 border-emerald-500/30" hover={false}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="font-semibold text-white">Limpeza Agendada</h4>
            <p className="text-sm text-slate-400">Amanhã, 14:00</p>
          </div>
          <Badge variant="warning" className="ml-auto">Em breve</Badge>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👩🏽</span>
            <span className="text-slate-300">Maria Silva</span>
          </div>
          <Button variant="ghost" size="sm">
            Ver detalhes <ChevronRight className="w-4 h-4 ml-1 inline" />
          </Button>
        </div>
      </Card>
    </div>
  );

  // History Tab
  const HistoryTab = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Histórico de Limpezas</h2>
      {mockHistory.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-xl">
                  👩🏽
                </div>
                <div>
                  <h4 className="font-semibold text-white">{item.cleaner}</h4>
                  <p className="text-sm text-slate-400">{item.date}</p>
                </div>
              </div>
              <Badge variant="success">Concluído</Badge>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <span className="text-slate-400">{item.type}</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-4 h-4 ${i < item.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} 
                    />
                  ))}
                </div>
                <span className="text-emerald-400 font-bold">R$ {item.price}</span>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );

  // Payments Tab
  const PaymentsTab = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Pagamentos</h2>
      
      {/* Payment Methods */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3">Métodos de Pagamento</h3>
        <Card className="p-4" hover={false}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">•••• •••• •••• 4242</p>
              <p className="text-sm text-slate-400">Vence 12/28</p>
            </div>
            <Badge variant="success">Padrão</Badge>
          </div>
        </Card>
        <Button variant="outline" className="w-full mt-3">
          <Plus className="w-5 h-5 mr-2 inline" />
          Adicionar Cartão
        </Button>
      </div>

      {/* Recent Transactions */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3">Transações Recentes</h3>
        <div className="space-y-3">
          {mockHistory.map((item, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{item.type}</p>
                    <p className="text-sm text-slate-400">{item.date}</p>
                  </div>
                </div>
                <span className="text-white font-semibold">R$ {item.price}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  // Profile Tab
  const ProfileTab = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
          👤
        </div>
        <h2 className="text-xl font-bold text-white">Carlos Mendes</h2>
        <p className="text-slate-400">carlos@email.com</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Badge variant="success">Cliente desde 2024</Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Limpezas', value: '12' },
          { label: 'Avaliações', value: '4.9' },
          { label: 'Economia', value: 'R$ 280' },
        ].map((stat, i) => (
          <Card key={i} className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{stat.value}</p>
            <p className="text-xs text-slate-400">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Menu Items */}
      <div className="space-y-2">
        {[
          { icon: User, label: 'Editar Perfil' },
          { icon: MapPin, label: 'Meus Endereços' },
          { icon: Bell, label: 'Notificações' },
          { icon: Shield, label: 'Privacidade' },
          { icon: MessageCircle, label: 'Suporte' },
        ].map((item, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-slate-400" />
                <span className="text-white">{item.label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </div>
          </Card>
        ))}
      </div>

      <Button variant="danger" className="w-full" onClick={onLogout}>
        <LogOut className="w-5 h-5 mr-2 inline" />
        Sair da Conta
      </Button>
    </div>
  );

  // Booking Modal
  const BookingModal = () => (
    <AnimatePresence>
      {showBooking && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
          onClick={() => setShowBooking(false)}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Agendar Limpeza</h2>
              <button 
                onClick={() => setShowBooking(false)}
                className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3].map((step) => (
                <div 
                  key={step}
                  className={`flex-1 h-2 rounded-full ${step <= bookingStep ? 'bg-emerald-500' : 'bg-slate-700'}`}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              {bookingStep === 1 && (
                <motion.div key="step1" {...fadeIn} className="space-y-4">
                  <h3 className="font-semibold text-slate-300">Tipo de Limpeza</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {cleaningTypes.map((type) => (
                      <motion.button
                        key={type.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setBookingData({...bookingData, type: type.id})}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${bookingData.type === type.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 hover:border-white/30'}`}
                      >
                        <type.icon className={`w-8 h-8 mb-2 ${bookingData.type === type.id ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <p className={`font-semibold ${bookingData.type === type.id ? 'text-emerald-400' : 'text-white'}`}>{type.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{type.desc}</p>
                        <p className="text-emerald-400 font-bold mt-2">R$ {type.price}+</p>
                      </motion.button>
                    ))}
                  </div>

                  <div className="pt-4">
                    <label className="text-sm text-slate-400 block mb-2">Tamanho do imóvel: {bookingData.size}m²</label>
                    <input
                      type="range"
                      min="30"
                      max="300"
                      value={bookingData.size}
                      onChange={(e) => setBookingData({...bookingData, size: parseInt(e.target.value)})}
                      className="w-full accent-emerald-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>30m²</span>
                      <span>300m²</span>
                    </div>
                  </div>

                  <Button className="w-full" onClick={() => setBookingStep(2)}>
                    Continuar
                  </Button>
                </motion.div>
              )}

              {bookingStep === 2 && (
                <motion.div key="step2" {...fadeIn} className="space-y-4">
                  <h3 className="font-semibold text-slate-300">Data e Horário</h3>
                  
                  <Input
                    icon={Calendar}
                    label="Data"
                    type="date"
                    value={bookingData.date}
                    onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
                  />
                  
                  <div>
                    <label className="text-sm text-slate-400 block mb-2">Horário</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['08:00', '10:00', '14:00', '16:00'].map((time) => (
                        <button
                          key={time}
                          onClick={() => setBookingData({...bookingData, time})}
                          className={`py-3 rounded-xl border-2 transition-all ${bookingData.time === time ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-white/10 text-slate-400 hover:border-white/30'}`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input
                    icon={MapPin}
                    label="Endereço"
                    placeholder="Rua, número, bairro"
                    value={bookingData.address}
                    onChange={(e) => setBookingData({...bookingData, address: e.target.value})}
                  />

                  <Input
                    icon={MessageCircle}
                    label="Observações (opcional)"
                    placeholder="Instruções especiais..."
                    value={bookingData.notes}
                    onChange={(e) => setBookingData({...bookingData, notes: e.target.value})}
                  />

                  <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => setBookingStep(1)}>
                      Voltar
                    </Button>
                    <Button className="flex-1" onClick={() => setBookingStep(3)}>
                      Continuar
                    </Button>
                  </div>
                </motion.div>
              )}

              {bookingStep === 3 && (
                <motion.div key="step3" {...fadeIn} className="space-y-4">
                  <h3 className="font-semibold text-slate-300">Confirmar Agendamento</h3>
                  
                  <Card className="p-4" hover={false}>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tipo</span>
                        <span className="text-white font-medium">{cleaningTypes.find(t => t.id === bookingData.type)?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tamanho</span>
                        <span className="text-white font-medium">{bookingData.size}m²</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Data</span>
                        <span className="text-white font-medium">{bookingData.date || 'Não selecionada'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Horário</span>
                        <span className="text-white font-medium">{bookingData.time || 'Não selecionado'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Endereço</span>
                        <span className="text-white font-medium text-right max-w-[200px]">{bookingData.address || 'Não informado'}</span>
                      </div>
                      <div className="pt-3 border-t border-white/10 flex justify-between">
                        <span className="text-slate-400">Total Estimado</span>
                        <span className="text-2xl font-bold text-emerald-400">R$ {calculatePrice()}</span>
                      </div>
                    </div>
                  </Card>

                  {selectedCleaner && (
                    <Card className="p-4" hover={false}>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-xl">
                          {selectedCleaner.photo}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{selectedCleaner.name}</p>
                          <p className="text-sm text-slate-400">Faxineira selecionada</p>
                        </div>
                      </div>
                    </Card>
                  )}

                  <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => setBookingStep(2)}>
                      Voltar
                    </Button>
                    <Button className="flex-1" onClick={() => {
                      setShowBooking(false);
                      setBookingStep(1);
                      alert('Limpeza agendada com sucesso! ✨');
                    }}>
                      Confirmar R$ {calculatePrice()}
                    </Button>
                  </div>

                  <p className="text-xs text-slate-500 text-center">
                    O pagamento será processado apenas após a conclusão do serviço
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && <motion.div key="home" {...fadeIn}><HomeTab /></motion.div>}
          {activeTab === 'history' && <motion.div key="history" {...fadeIn}><HistoryTab /></motion.div>}
          {activeTab === 'payments' && <motion.div key="payments" {...fadeIn}><PaymentsTab /></motion.div>}
          {activeTab === 'profile' && <motion.div key="profile" {...fadeIn}><ProfileTab /></motion.div>}
        </AnimatePresence>
      </main>
      <Navigation />
      <BookingModal />
    </div>
  );
};

// ==================== DASHBOARD DA FAXINEIRA ====================
const CleanerDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [showRequestDetail, setShowRequestDetail] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

  // Header
  const Header = () => (
    <header className="bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-white">LimpeJá</span>
            <span className="text-xs text-slate-400 block">Profissional</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOnline(!isOnline)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${isOnline ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}
          >
            {isOnline ? '🟢 Online' : '⚫ Offline'}
          </motion.button>
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-xl">
            👩🏽
          </div>
        </div>
      </div>
    </header>
  );

  // Navigation
  const Navigation = () => (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 z-50">
      <div className="max-w-lg mx-auto px-4 py-2 flex justify-around">
        {[
          { id: 'home', icon: Home, label: 'Início' },
          { id: 'requests', icon: Bell, label: 'Solicitações' },
          { id: 'earnings', icon: DollarSign, label: 'Ganhos' },
          { id: 'profile', icon: User, label: 'Perfil' },
        ].map(item => (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${activeTab === item.id ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-xs font-medium">{item.label}</span>
            {item.id === 'requests' && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                {mockRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </nav>
  );

  // Home Tab
  const HomeTab = () => (
    <div className="space-y-6">
      {/* Stats Overview */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <h2 className="text-lg text-emerald-100 mb-1">Ganhos este mês</h2>
          <p className="text-4xl font-black text-white mb-4">R$ 2.450</p>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-xl px-3 py-2">
              <p className="text-xs text-emerald-100">Limpezas</p>
              <p className="text-xl font-bold text-white">18</p>
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-2">
              <p className="text-xs text-emerald-100">Avaliação</p>
              <p className="text-xl font-bold text-white">4.9 ⭐</p>
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-2">
              <p className="text-xs text-emerald-100">Taxa Aceitação</p>
              <p className="text-xl font-bold text-white">95%</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <Calendar className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="font-semibold text-white">Minha Agenda</p>
          <p className="text-xs text-slate-400">3 agendamentos hoje</p>
        </Card>
        <Card className="p-4 text-center">
          <MapPin className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="font-semibold text-white">Área de Atuação</p>
          <p className="text-xs text-slate-400">Centro, 5km raio</p>
        </Card>
      </div>

      {/* New Requests */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Novas Solicitações</h3>
          <Badge variant="warning">{mockRequests.filter(r => r.status === 'pending').length} pendentes</Badge>
        </div>
        <div className="space-y-3">
          {mockRequests.filter(r => r.status === 'pending').slice(0, 2).map((request, i) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card 
                className="p-4 cursor-pointer border-amber-500/30"
                onClick={() => setShowRequestDetail(request)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-white">{request.type}</h4>
                    <p className="text-sm text-slate-400">{request.client}</p>
                  </div>
                  <Badge variant="success">R$ {request.price}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {request.address.split(',')[0]}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {request.date}, {request.time}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="danger" size="sm" className="flex-1" onClick={(e) => e.stopPropagation()}>
                    <X className="w-4 h-4 mr-1 inline" /> Recusar
                  </Button>
                  <Button size="sm" className="flex-1" onClick={(e) => {
                    e.stopPropagation();
                    alert('Solicitação aceita! ✨');
                  }}>
                    <Check className="w-4 h-4 mr-1 inline" /> Aceitar
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Today's Schedule */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Agenda de Hoje</h3>
        <Card className="p-4" hover={false}>
          <div className="flex items-center gap-4">
            <div className="w-16 text-center">
              <p className="text-2xl font-bold text-emerald-400">14</p>
              <p className="text-xs text-slate-400">JAN</p>
            </div>
            <div className="flex-1 border-l border-white/10 pl-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">09:00 - Limpeza Completa</p>
                  <p className="text-sm text-slate-400">Rua das Flores, 123</p>
                </div>
                <Badge variant="info">Em breve</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">14:00 - Limpeza Básica</p>
                  <p className="text-sm text-slate-400">Av. Brasil, 456</p>
                </div>
                <Badge variant="default">Agendado</Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  // Requests Tab
  const RequestsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Solicitações</h2>
        <Button variant="ghost" size="sm">
          <Filter className="w-4 h-4 mr-2 inline" /> Filtrar
        </Button>
      </div>
      
      {mockRequests.map((request, i) => (
        <motion.div
          key={request.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Card className="p-4" onClick={() => setShowRequestDetail(request)}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-white">{request.type}</h4>
                <p className="text-sm text-slate-400">{request.client} • {request.size}</p>
              </div>
              <div className="text-right">
                <p className="text-emerald-400 font-bold">R$ {request.price}</p>
                <Badge variant={request.status === 'pending' ? 'warning' : 'success'} className="mt-1">
                  {request.status === 'pending' ? 'Pendente' : 'Aceito'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {request.address}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {request.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {request.time}
              </span>
            </div>
            {request.status === 'pending' && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                <Button variant="danger" size="sm" className="flex-1">
                  <X className="w-4 h-4 mr-1 inline" /> Recusar
                </Button>
                <Button size="sm" className="flex-1">
                  <Check className="w-4 h-4 mr-1 inline" /> Aceitar
                </Button>
              </div>
            )}
          </Card>
        </motion.div>
      ))}
    </div>
  );

  // Earnings Tab
  const EarningsTab = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Meus Ganhos</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 text-center bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30">
          <p className="text-sm text-slate-400">Este mês</p>
          <p className="text-3xl font-black text-emerald-400">R$ 2.450</p>
          <p className="text-xs text-emerald-400 flex items-center justify-center gap-1 mt-1">
            <TrendingUp className="w-4 h-4" /> +15% vs mês anterior
          </p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-slate-400">Disponível p/ saque</p>
          <p className="text-3xl font-black text-white">R$ 1.850</p>
          <Button variant="outline" size="sm" className="mt-2">Sacar</Button>
        </Card>
      </div>

      {/* Weekly Chart Placeholder */}
      <Card className="p-4" hover={false}>
        <h3 className="font-semibold text-white mb-4">Ganhos da Semana</h3>
        <div className="flex items-end justify-between h-32 gap-2">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day, i) => {
            const heights = [60, 80, 40, 100, 75, 90, 30];
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-2">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${heights[i]}%` }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-lg"
                />
                <span className="text-xs text-slate-500">{day}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recent Earnings */}
      <div>
        <h3 className="font-semibold text-white mb-3">Histórico de Ganhos</h3>
        <div className="space-y-2">
          {[
            { date: '13/01', client: 'Carlos M.', type: 'Limpeza Completa', value: 150, status: 'paid' },
            { date: '12/01', client: 'Ana P.', type: 'Limpeza Básica', value: 100, status: 'paid' },
            { date: '11/01', client: 'Roberto S.', type: 'Pós-obra', value: 280, status: 'pending' },
          ].map((item, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.status === 'paid' ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                    {item.status === 'paid' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white">{item.type}</p>
                    <p className="text-sm text-slate-400">{item.client} • {item.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-bold">R$ {item.value}</p>
                  <Badge variant={item.status === 'paid' ? 'success' : 'warning'}>
                    {item.status === 'paid' ? 'Pago' : 'Pendente'}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  // Profile Tab
  const ProfileTab = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="text-center">
        <div className="relative inline-block">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
            👩🏽
          </div>
          <button className="absolute bottom-3 right-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
            <Camera className="w-4 h-4 text-white" />
          </button>
        </div>
        <h2 className="text-xl font-bold text-white">Maria Silva</h2>
        <p className="text-slate-400">maria@email.com</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Badge variant="success">
            <Shield className="w-3 h-3 inline mr-1" /> Verificada
          </Badge>
          <Badge variant="info">
            <Award className="w-3 h-3 inline mr-1" /> Top 10%
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Limpezas', value: '127' },
          { label: 'Avaliação', value: '4.9' },
          { label: 'Clientes', value: '89' },
        ].map((stat, i) => (
          <Card key={i} className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{stat.value}</p>
            <p className="text-xs text-slate-400">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Services */}
      <Card className="p-4" hover={false}>
        <h3 className="font-semibold text-white mb-3">Serviços Oferecidos</h3>
        <div className="flex flex-wrap gap-2">
          {['Residencial', 'Comercial', 'Pós-obra', 'Limpeza Pesada'].map(service => (
            <Badge key={service} variant="success">{service}</Badge>
          ))}
        </div>
      </Card>

      {/* Menu Items */}
      <div className="space-y-2">
        {[
          { icon: User, label: 'Editar Perfil' },
          { icon: MapPin, label: 'Área de Atuação' },
          { icon: Calendar, label: 'Disponibilidade' },
          { icon: CreditCard, label: 'Dados Bancários' },
          { icon: Shield, label: 'Documentos' },
          { icon: MessageCircle, label: 'Suporte' },
        ].map((item, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-slate-400" />
                <span className="text-white">{item.label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </div>
          </Card>
        ))}
      </div>

      <Button variant="danger" className="w-full" onClick={onLogout}>
        <LogOut className="w-5 h-5 mr-2 inline" />
        Sair da Conta
      </Button>
    </div>
  );

  // Request Detail Modal
  const RequestDetailModal = () => (
    <AnimatePresence>
      {showRequestDetail && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
          onClick={() => setShowRequestDetail(null)}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-3xl sm:rounded-3xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Detalhes da Solicitação</h2>
              <button 
                onClick={() => setShowRequestDetail(null)}
                className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <Card className="p-4" hover={false}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center text-2xl">
                    👤
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{showRequestDetail.client}</h3>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="text-sm text-slate-400">4.8 (23 avaliações)</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tipo</span>
                    <span className="text-white">{showRequestDetail.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tamanho</span>
                    <span className="text-white">{showRequestDetail.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Data</span>
                    <span className="text-white">{showRequestDetail.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Horário</span>
                    <span className="text-white">{showRequestDetail.time}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4" hover={false}>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-white">{showRequestDetail.address}</p>
                    <p className="text-sm text-slate-400">~2.5km de você</p>
                  </div>
                </div>
              </Card>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-400">Valor do serviço</p>
                <p className="text-3xl font-black text-emerald-400">R$ {showRequestDetail.price}</p>
                <p className="text-xs text-slate-500">Taxa da plataforma: R$ {Math.round(showRequestDetail.price * 0.15)}</p>
              </div>

              <div className="flex gap-3">
                <Button variant="danger" className="flex-1" onClick={() => setShowRequestDetail(null)}>
                  <X className="w-5 h-5 mr-2 inline" /> Recusar
                </Button>
                <Button className="flex-1" onClick={() => {
                  setShowRequestDetail(null);
                  alert('Solicitação aceita! ✨');
                }}>
                  <Check className="w-5 h-5 mr-2 inline" /> Aceitar
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && <motion.div key="home" {...fadeIn}><HomeTab /></motion.div>}
          {activeTab === 'requests' && <motion.div key="requests" {...fadeIn}><RequestsTab /></motion.div>}
          {activeTab === 'earnings' && <motion.div key="earnings" {...fadeIn}><EarningsTab /></motion.div>}
          {activeTab === 'profile' && <motion.div key="profile" {...fadeIn}><ProfileTab /></motion.div>}
        </AnimatePresence>
      </main>
      <Navigation />
      <RequestDetailModal />
    </div>
  );
};

// ==================== APP PRINCIPAL ====================
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null);

  const handleLogin = (type) => {
    setUserType(type);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserType(null);
  };

  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  if (userType === 'cleaner') {
    return <CleanerDashboard onLogout={handleLogout} />;
  }

  return <ClientDashboard onLogout={handleLogout} />;
}