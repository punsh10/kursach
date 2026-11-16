const { useState, useEffect } = React;

/* ============================================================
   ЛОКАЛЬНАЯ БАЗА ДАННЫХ (замена PHP + MySQL)
   ============================================================ */
const LocalDB = {
    KEYS: { USERS: 'flower-users', ORDERS: 'flower-orders' },

    getUsers()   { try { return JSON.parse(localStorage.getItem(this.KEYS.USERS)  || '[]'); } catch { return []; } },
    saveUsers(u) { localStorage.setItem(this.KEYS.USERS,  JSON.stringify(u)); },
    getOrders()  { try { return JSON.parse(localStorage.getItem(this.KEYS.ORDERS) || '[]'); } catch { return []; } },
    saveOrders(o){ localStorage.setItem(this.KEYS.ORDERS, JSON.stringify(o)); },

    init() {
        const users = this.getUsers();
        if (!users.find(u => u.email === 'admin@flowershop.ru')) {
            const nextId = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
            users.push({
                id: nextId,
                name: 'Администратор',
                email: 'admin@flowershop.ru',
                password: 'admin123',
                phone: '+7 (999) 111-11-11',
                role: 'admin'
            });
            this.saveUsers(users);
        }
    },

    register({ name, email, password, phone }) {
        const users = this.getUsers();
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            return { error: 'Пользователь с таким email уже существует' };
        }
        const id = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
        const user = { id, name, email, password, phone, role: 'user' };
        users.push(user);
        this.saveUsers(users);
        const { password: _, ...safe } = user;
        return { success: true, user: safe };
    },

    login(email, password) {
        const user = this.getUsers().find(
            u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );
        if (!user) return { error: 'Неверный email или пароль' };
        const { password: _, ...safe } = user;
        return { success: true, user: safe };
    },

    createOrder(data) {
        const orders = this.getOrders();
        const id = orders.length ? Math.max(...orders.map(o => o.id)) + 1 : 1;
        orders.push({ ...data, id, status: 'Новый', created_at: new Date().toISOString() });
        this.saveOrders(orders);
        return { success: true, order_id: id };
    },

    getUserOrders(userId) {
        return this.getOrders().filter(o => String(o.user_id) === String(userId));
    },

    getAllOrders() { return this.getOrders(); },

    updateStatus(orderId, status) {
        const orders = this.getOrders();
        const idx = orders.findIndex(o => o.id === orderId);
        if (idx === -1) return { error: 'Заказ не найден' };
        orders[idx].status = status;
        this.saveOrders(orders);
        return { success: true, message: `Статус заказа #${orderId} изменён на "${status}"` };
    }
};

/* ================= КАТАЛОГ ================= */
const FLOWERS_DATA = [
    { id: 1, title: "Букет 'Белый шик'", price: 4100, category: "Микс", image: "images/1-white.png", description: "Роскошный и нежный букет, состоящий из белых роз, гортензий и калл. Идеально подходит для свадебного торжества или в качестве изысканного подарка." },
    { id: 2, title: "Букет 'Красное сердце'", price: 3900, category: "Розы", image: "images/2-red.png", description: "Классика жанра. Букет из 15 бархатных красных роз, дополненный веточками эвкалипта и декоративными бусинами. Символ страстной любви." },
    { id: 3, title: "Букет 'Весенний бриз'", price: 2800, category: "Микс", image: "images/3-spring.png", description: "Яркая и свежая композиция из тюльпанов, гиацинтов и мимозы. Этот букет подарит весеннее настроение даже в самый пасмурный день." },
    { id: 4, title: "Букет 'Розовое облако'", price: 3500, category: "Пионы", image: "images/4-pink.png", description: "Воздушный и романтичный букет из крупных розовых пионов и кустовых роз. Нежные оттенки и пышные формы покорят любую девушку." },
    { id: 5, title: "Букет 'Закат в Провансе'", price: 4500, category: "Микс", image: "images/5-provence.png", description: "Французский шарм в каждой веточке. Розы пудровых оттенков, лаванда и ароматный эвкалипт создают атмосферу уюта и тепла." },
    { id: 6, title: "Букет 'Полевой роман'", price: 2100, category: "Полевые", image: "images/6-field.png", description: "Искренний и простой букет из ромашек, васильков и колосков. Для тех, кто ценит естественную красоту и теплоту полевых цветов." }
];

const GIFT_SETS_DATA = [
    { id: 101, title: "Набор «Sunny Harvest»", price: 2500, image: "images/gift-sunny.png", description: "Искренний и полезный подарок, наполненный витаминами и теплом. В плетеную корзину мы бережно уложили свежие сезонные фрукты (яблоки, апельсины, виноград), баночку отборного варенья и травяной чай для укрепления здоровья. Классический знак внимания, который согреет сердце." },
    { id: 102, title: "Набор «Cozy Mood»", price: 3500, image: "images/gift-cozy.png", description: "Идеальный набор для тех, кто ценит уютные вечера. Внутри стильной белой корзины вы найдете мягкого плюшевого мишку, плитку крафтового шоколада, ароматическую свечу для создания теплой атмосферы и стильную керамическую кружку. Этот набор — отличный способ сказать «Я тебя люблю»." },
    { id: 103, title: "Набор «Silk & Tea»", price: 5800, image: "images/gift-silk.png", description: "Роскошный набор для истинного расслабления. В элегантной корзине: премиальные сорта листового чая, натуральный цветочный мед, изысканная чайная пара и бутылка благородного вина. Создан для того, чтобы мама могла налить себе чашку чая, расслабиться и почувствовать себя особенной." }
];

const CONSTRUCTOR_FLOWERS = [
    { id: 'mimosa', title: 'Мимоза', price: 100, image: 'images/flower-mimosa.png' },
    { id: 'tulip', title: 'Тюльпан', price: 120, image: 'images/flower-tulip.png' },
    { id: 'rose', title: 'Роза', price: 150, image: 'images/flower-rose.png' },
    { id: 'lisianthus', title: 'Эустома', price: 200, image: 'images/flower-lisianthus.png' },
    { id: 'peony', title: 'Пион', price: 250, image: 'images/flower-peony.png' },
    { id: 'orchid', title: 'Орхидея', price: 300, image: 'images/flower-orchid.png' }
];

const CONSTRUCTOR_PAPER = [
    { id: 'kraft_paper', title: 'Крафтовая', price: 100, image: 'images/paper-kraft.png' },
    { id: 'gold_paper', title: 'Золотая', price: 200, image: 'images/paper-gold.png' },
    { id: 'silver_paper', title: 'Серебряная', price: 200, image: 'images/paper-silver.png' }
];

const CONSTRUCTOR_GREENERY = [
    { id: 'ruscus', title: 'Рускус', price: 50, image: 'images/green-ruscus.png' },
    { id: 'olive', title: 'Олива', price: 70, image: 'images/green-olive.png' },
    { id: 'eucalyptus', title: 'Эвкалипт', price: 80, image: 'images/green-eucalyptus.png' }
];

/* ================= ШАПКА ================= */
function Header({ cartCount, setPage, currentUser, logout }) {
    const scrollToSection = (id, pageName) => {
        setPage(pageName);
        setTimeout(() => {
            if (id === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
            else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    };

    return (
        <header className="header">
            <div className="container">
                <div className="header-left">
                    <div className="logo" onClick={() => scrollToSection('top', 'home')}>🌸 FlowerShop</div>
                    <nav className="nav-links">
                        <a onClick={() => scrollToSection('top', 'home')}>Главная</a>
                        <a onClick={() => scrollToSection('catalog', 'catalog')}>Каталог</a>
                        <a onClick={() => scrollToSection('gifts', 'home')}>Подарочные наборы</a>
                    </nav>
                </div>
                <div className="header-right">
                    <div className="user-info">
                        {currentUser ? (
                            <>
                                <span className="user-name">Привет, {currentUser.name}!</span>
                                <a onClick={logout} className="logout-btn">Выйти</a>
                            </>
                        ) : (
                            <a onClick={() => setPage('auth')} className="user-name">Вход / Регистрация</a>
                        )}
                    </div>
                    <div className="header-icons">
                        <div className="cart-icon" onClick={() => setPage('cart')}>
                            🛒 <span>Корзина</span> {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
                        </div>
                        {currentUser && (
                            <a onClick={() => setPage('user_orders')} className="user-orders-link">
                                🛍️ <span>Мои заказы</span>
                            </a>
                        )}
                        {currentUser && currentUser.role === 'admin' && (
                            <a onClick={() => setPage('admin_orders')} className="admin-link">
                                📦 <span>Все заказы</span>
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

/* ================= КАРТОЧКА ТОВАРА ================= */
function ProductCard({ product, addToCart, onOpen }) {
    return (
        <div className="product-card glass-panel" onClick={() => onOpen(product)}>
            <img src={product.image} alt={product.title} className="product-image" />
            <div className="product-info">
                <h3 className="product-title">{product.title}</h3>
                <p className="product-price">{product.price} ₽</p>
                <button className="btn" onClick={(e) => { e.stopPropagation(); addToCart(product); }}>
                    В корзину
                </button>
            </div>
        </div>
    );
}

/* ================= МОДАЛКА ТОВАРА ================= */
function ProductModal({ product, onClose, addToCart }) {
    if (!product) return null;
    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 3000 }}>
            <div className="product-modal-content" onClick={e => e.stopPropagation()}>
                <button className="product-modal-close" onClick={onClose}>&times;</button>
                <div className="product-modal-image-wrapper">
                    <img src={product.image} alt={product.title} className="product-modal-img" />
                </div>
                <div className="product-modal-right">
                    <div className="product-modal-desc-box">
                        <h2 className="product-modal-title">{product.title}</h2>
                        <p className="product-modal-desc">{product.description}</p>
                        <div className="product-modal-price">{product.price} ₽</div>
                    </div>
                    <button className="product-modal-btn" onClick={() => { addToCart(product); onClose(); }}>
                        В корзину
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ================= КОНСТРУКТОР БУКЕТА ================= */
function BouquetConstructor({ isOpen, onClose, addToCart }) {
    const [qty, setQty] = useState({});
    if (!isOpen) return null;

    const handleAdd = (id) => setQty(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    const handleRemove = (id) => {
        setQty(prev => {
            const cur = prev[id] || 0;
            if (cur <= 1) { const c = { ...prev }; delete c[id]; return c; }
            return { ...prev, [id]: cur - 1 };
        });
    };

    const calculateTotal = () => {
        let total = 0;
        [...CONSTRUCTOR_FLOWERS, ...CONSTRUCTOR_PAPER, ...CONSTRUCTOR_GREENERY].forEach(opt => {
            if (qty[opt.id]) total += opt.price * qty[opt.id];
        });
        return total;
    };

    const handleAddToCart = () => {
        const total = calculateTotal();
        if (total === 0) { alert("Выберите хотя бы один элемент для букета!"); return; }
        const details = [];
        [...CONSTRUCTOR_FLOWERS, ...CONSTRUCTOR_PAPER, ...CONSTRUCTOR_GREENERY].forEach(opt => {
            if (qty[opt.id]) details.push(`${opt.title} (${qty[opt.id]} шт.)`);
        });
        addToCart({
            id: 'custom_' + Date.now(),
            title: "Индивидуальный букет",
            price: total,
            image: "images/4-pink.png",
            quantity: 1,
            description: details.join(', ')
        });
        setQty({});
        onClose();
    };

    const renderOptions = (options, title) => (
        <div className="constructor-section">
            <h3>{title}</h3>
            <div className="options-grid">
                {options.map(opt => (
                    <div key={opt.id} className="option-card">
                        <img src={opt.image} alt={opt.title} />
                        <div className="option-title">{opt.title}</div>
                        <div className="option-price">{opt.price} ₽</div>
                        <div className="qty-controls">
                            <button className={`qty-btn ${qty[opt.id] ? 'active' : ''}`} onClick={() => handleRemove(opt.id)}>-</button>
                            <span className="qty-value">{qty[opt.id] || 0}</span>
                            <button className="qty-btn" onClick={() => handleAdd(opt.id)}>+</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Собери свой идеальный букет</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {renderOptions(CONSTRUCTOR_FLOWERS, "Цветы (за 1 шт.)")}
                    {renderOptions(CONSTRUCTOR_PAPER, "Упаковка (за 1 оборот)")}
                    {renderOptions(CONSTRUCTOR_GREENERY, "Зелень (за 1 веточку)")}
                </div>
                <div className="modal-footer">
                    <div className="total-price">Итого: <span>{calculateTotal()} ₽</span></div>
                    <button className="btn" onClick={handleAddToCart}>Добавить в корзину</button>
                </div>
            </div>
        </div>
    );
}

/* ================= ГЛАВНАЯ ================= */
function HomePage({ addToCart }) {
    const [isConstructorOpen, setIsConstructorOpen] = useState(false);
    const [selectedBouquet, setSelectedBouquet] = useState(null);

    return (
        <div id="top">
            <div className="home-section glass-panel">
                <section className="home-article">
                    <h2>Добро пожаловать в FlowerShop!</h2>
                    <div className="article-columns">
                        <p>Мы рады приветствовать вас в нашем цветочном мире! FlowerShop — это место, где каждая деталь создана для того, чтобы дарить радость. Мы знаем, как важно вовремя сказать самые главные слова, поэтому наша команда делает всё возможное, чтобы ваш подарок был безупречным.</p>
                        <p>Быстрая доставка, бережное отношение к каждому лепестку и внимание к вашим пожеланиям — вот наши главные принципы. Выберите готовый букет в каталоге ниже или создайте свой уникальный подарок с помощью нашего конструктора!</p>
                    </div>
                    <div className="article-quote">«Мы работаем без выходных и доставляем заказы в течение 2 часов. Выберите свой идеальный букет ниже!»</div>
                </section>
            </div>

            <div className="home-section glass-panel">
                <div className="about-section">
                    <div className="about-image">
                        <img src="images/4-pink.png" alt="О нас" />
                    </div>
                    <div className="about-text">
                        <h1>О компании FlowerShop</h1>
                        <p>FlowerShop на рынке уже более 8 лет. За это время мы прошли путь от небольшой лавки до современного сервиса доставки. Наша главная гордость — собственные оранжереи.</p>
                        <p>Благодаря этому мы контролируем качество на всех этапах: от посадки семян до момента, когда букет оказывается в руках получателя.</p>
                        <p>Наши флористы — настоящие мастера с художественным вкусом, которые ежедневно создают шедевры флористики. Мы гордимся тем, что помогаем людям выражать свои чувства через красоту природы.</p>
                    </div>
                </div>
            </div>

            <div id="catalog">
                <h2 style={{ textAlign: 'center', marginTop: '40px', marginBottom: '20px', fontSize: '32px', color: 'var(--primary-color)', fontWeight: '700' }}>Каталог букетов</h2>
                <div className="products-grid">
                    {FLOWERS_DATA.map(product => (
                        <ProductCard key={product.id} product={product} addToCart={addToCart} onOpen={setSelectedBouquet} />
                    ))}
                </div>
            </div>

            <div id="gifts">
                <h2 style={{ textAlign: 'center', marginTop: '40px', marginBottom: '20px', fontSize: '32px', color: 'var(--primary-color)', fontWeight: '700' }}>Подарочные наборы</h2>
                <div className="products-grid">
                    {GIFT_SETS_DATA.map(product => (
                        <ProductCard key={product.id} product={product} addToCart={addToCart} onOpen={setSelectedBouquet} />
                    ))}
                </div>
            </div>

            <div className="constructor-banner" onClick={() => setIsConstructorOpen(true)}>
                <div className="constructor-banner-images">
                    <img src="images/5-provence.png" alt="Букет" />
                    <img src="images/3-spring.png" alt="Букет" />
                    <img src="images/4-pink.png" alt="Букет" />
                </div>
                <div className="constructor-banner-content">
                    <button className="glass-btn">Собери свой букет сам!</button>
                </div>
            </div>

            <BouquetConstructor isOpen={isConstructorOpen} onClose={() => setIsConstructorOpen(false)} addToCart={addToCart} />
            <ProductModal product={selectedBouquet} onClose={() => setSelectedBouquet(null)} addToCart={addToCart} />
        </div>
    );
}

/* ================= АВТОРИЗАЦИЯ ================= */
function AuthPage({ loginUser, setPage }) {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.email || !formData.password || (!isLogin && (!formData.name || !formData.phone))) {
            setError('Заполните все поля!'); return;
        }
        setLoading(true); setError('');
        setTimeout(() => {
            setLoading(false);
            const result = isLogin
                ? LocalDB.login(formData.email, formData.password)
                : LocalDB.register(formData);
            if (result.error) setError(result.error);
            else if (result.success) { loginUser(result.user); setPage('home'); }
        }, 300);
    };

    return (
        <div className="auth-container glass-panel">
            <h2>{isLogin ? 'Вход в аккаунт' : 'Регистрация'}</h2>
            {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                {!isLogin && (
                    <>
                        <div className="form-group">
                            <label>Ваше имя</label>
                            <input type="text" placeholder="Иван" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Номер телефона</label>
                            <input type="tel" placeholder="+7 (999) 000-00-00" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        </div>
                    </>
                )}
                <div className="form-group">
                    <label>Email</label>
                    <input type="email" placeholder="mail@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="form-group">
                    <label>Пароль</label>
                    <div className="password-wrapper">
                        <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                        <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? '🙈' : '👁️'}
                        </button>
                    </div>
                </div>
                <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
                    {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
                </button>
            </form>
            <div className="auth-switch">
                {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
                <a onClick={() => { setIsLogin(!isLogin); setError(''); setShowPassword(false); }}>
                    {isLogin ? 'Зарегистрируйтесь' : 'Войдите'}
                </a>
            </div>
            {isLogin && (
                <div style={{ marginTop: '20px', padding: '10px', background: '#fff8dc', borderRadius: '8px', fontSize: '12px', color: '#666', textAlign: 'center', lineHeight: 1.5 }}>
                    <strong>Демо-админ:</strong><br/>
                    admin@flowershop.ru / admin123
                </div>
            )}
        </div>
    );
}

/* ================= КОРЗИНА ================= */
function CartPage({ cart, removeFromCart, getTotal, setPage, clearCart, currentUser }) {
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [loading, setLoading] = useState(false);
    const [phone, setPhone] = useState(currentUser?.phone || '');
    const [showCardModal, setShowCardModal] = useState(false);
    const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '' });
    const [isProcessing, setIsProcessing] = useState(false);

    if (cart.length === 0) {
        return (
            <div className="not-found glass-panel">
                <h2>Ваша корзина пуста 😢</h2>
                <button className="btn" style={{ marginTop: '20px' }} onClick={() => setPage('catalog')}>Перейти к покупкам</button>
            </div>
        );
    }

    const executeOrder = () => {
        if (!currentUser?.id) {
            alert('Ошибка: Не удалось определить ID пользователя. Пожалуйста, войдите в аккаунт заново.');
            setPage('auth'); return;
        }
        setLoading(true);
        const orderData = {
            user_id: currentUser.id,
            user_name: currentUser.name,
            user_email: currentUser.email,
            total_price: getTotal(),
            payment_method: paymentMethod,
            phone: phone,
            items: cart.map(item => ({
                id: item.id,
                product_name: item.title,
                quantity: item.quantity,
                price: item.price
            }))
        };
        setTimeout(() => {
            const result = LocalDB.createOrder(orderData);
            setLoading(false);
            setShowCardModal(false);
            if (result.success) {
                alert(`Всё прошло успешно, ожидайте ваш заказ! (Заказ №${result.order_id})`);
                clearCart();
                setPage('user_orders');
            } else {
                alert('Ошибка при создании заказа: ' + (result.error || 'Неизвестная ошибка'));
            }
        }, 400);
    };

    const handlePayClick = () => {
        if (!currentUser) { alert('Для оформления заказа необходимо войти в аккаунт!'); setPage('auth'); return; }
        if (!phone) { alert('Пожалуйста, укажите номер телефона для связи!'); return; }
        if (paymentMethod === 'card') setShowCardModal(true);
        else executeOrder();
    };

    const handleCardSubmit = (e) => {
        e.preventDefault();
        if (cardData.number.replace(/\s/g, '').length < 16 || cardData.expiry.length < 5 || cardData.cvv.length < 3) {
            alert("Пожалуйста, введите корректные данные карты!"); return;
        }
        setIsProcessing(true);
        setTimeout(() => { setIsProcessing(false); executeOrder(); }, 1500);
    };

    return (
        <div className="cart-page">
            <div className="cart-items">
                <h2 style={{ marginBottom: '20px', color: 'var(--primary-color)', textAlign: 'center' }}>Ваша корзина</h2>
                {cart.map(item => (
                    <div key={item.id} className="cart-item glass-panel">
                        <img src={item.image} alt={item.title} />
                        <div className="cart-item-info">
                            <h3>{item.title}</h3>
                            {item.description && <p style={{ fontSize: '12px', color: 'gray', margin: '5px 0' }}>{item.description}</p>}
                            <p>{item.price} ₽ x {item.quantity}</p>
                        </div>
                        <button className="btn btn-outline btn-small" onClick={() => removeFromCart(item.id)}>Удалить</button>
                    </div>
                ))}
            </div>
            <div className="cart-summary glass-panel">
                <h2>Оформление заказа</h2>
                <div className="form-group" style={{ marginTop: '20px' }}>
                    <label>Номер телефона для уведомлений</label>
                    <input type="tel" placeholder="+7 (999) 000-00-00" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div className="cart-total"><span>Сумма:</span><span>{getTotal()} ₽</span></div>
                <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Способ оплаты:</h3>
                <div className="payment-methods">
                    <button className={`payment-btn ${paymentMethod === 'card' ? 'active' : ''}`} onClick={() => setPaymentMethod('card')}>💳 Картой</button>
                    <button className={`payment-btn ${paymentMethod === 'qr' ? 'active' : ''}`} onClick={() => setPaymentMethod('qr')}>📱 QR-код</button>
                </div>
                {paymentMethod === 'qr' && (
                    <div className="qr-code-container">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=FlowerShop_Payment" alt="QR Code" />
                        <p style={{ fontSize: '14px', color: 'gray' }}>Отсканируйте для оплаты</p>
                    </div>
                )}
                <button className="btn" style={{ width: '100%', marginTop: '10px' }} onClick={handlePayClick} disabled={loading}>
                    {loading ? 'Отправка...' : `Оплатить ${getTotal()} ₽`}
                </button>
            </div>

            {showCardModal && (
                <div className="card-modal-overlay">
                    <div className="card-modal">
                        <h2>Оплата картой</h2>
                        {isProcessing ? (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <div className="spinner"></div>
                                <p style={{ marginTop: '20px', color: 'gray' }}>Связь с банком...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleCardSubmit}>
                                <div className="card-input-group">
                                    <label>Номер карты</label>
                                    <input type="text" placeholder="0000 0000 0000 0000" maxLength="19" value={cardData.number}
                                        onChange={(e) => {
                                            const v = e.target.value.replace(/\D/g, '');
                                            setCardData({ ...cardData, number: v.replace(/(\d{4})/g, '$1 ').trim() });
                                        }} />
                                </div>
                                <div className="card-row">
                                    <div className="card-input-group">
                                        <label>Срок действия</label>
                                        <input type="text" placeholder="ММ/ГГ" maxLength="5" value={cardData.expiry}
                                            onChange={(e) => {
                                                let v = e.target.value.replace(/\D/g, '');
                                                if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2);
                                                setCardData({ ...cardData, expiry: v });
                                            }} />
                                    </div>
                                    <div className="card-input-group">
                                        <label>CVV код</label>
                                        <input type="password" placeholder="•••" maxLength="3" value={cardData.cvv}
                                            onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '') })} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexDirection: 'column' }}>
                                    <button type="submit" className="btn">Списать {getTotal()} ₽</button>
                                    <button type="button" className="btn btn-outline" onClick={() => setShowCardModal(false)}>Отмена</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ================= МОИ ЗАКАЗЫ ================= */
function UserOrdersPage({ currentUser }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchUserOrders = (isManual = false) => {
        if (!currentUser?.id) { setLoading(false); return; }
        if (isManual) setRefreshing(true);
        setTimeout(() => {
            setOrders(LocalDB.getUserOrders(currentUser.id));
            setLoading(false);
            setRefreshing(false);
        }, 200);
    };

    useEffect(() => { fetchUserOrders(); }, [currentUser]);

    if (loading) return <div style={{ textAlign: 'center', margin: '50px' }}>Загрузка ваших заказов...</div>;

    return (
        <div className="admin-orders-container glass-panel">
            <div className="admin-title">
                <span>Мои заказы</span>
                <button className={`refresh-btn ${refreshing ? 'spinning' : ''}`} onClick={() => fetchUserOrders(true)} disabled={refreshing}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    Обновить
                </button>
            </div>

            {orders.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'gray', margin: '20px 0' }}>У вас пока нет заказов.</p>
            ) : (
                <table className="orders-table">
                    <thead>
                        <tr><th>№</th><th>Дата</th><th>Сумма</th><th>Состав</th><th>Статус</th></tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order.id}>
                                <td data-label="№">#{order.id}</td>
                                <td data-label="Дата">{new Date(order.created_at).toLocaleString('ru-RU')}</td>
                                <td data-label="Сумма" style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                    {order.total_price} ₽<br />
                                    <small>{order.payment_method === 'card' ? 'Карта' : 'QR-код'}</small>
                                </td>
                                <td data-label="Состав">
                                    <ul className="order-items-list">
                                        {order.items && order.items.map((item, idx) => (
                                            <li key={idx}>{item.product_name || item.title} — {item.quantity} шт.</li>
                                        ))}
                                    </ul>
                                </td>
                                <td data-label="Статус">
                                    <div className="status-badge" style={{
                                        background: order.status === 'Завершен' ? '#d4edda' : '#ffeeba',
                                        color: order.status === 'Завершен' ? '#155724' : '#856404'
                                    }}>
                                        {order.status}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

/* ================= АДМИНКА ================= */
function AdminOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, orderId: null });

    const fetchOrders = () => {
        const active = LocalDB.getAllOrders().filter(o => o.status !== 'Завершен');
        setOrders(active);
        setLoading(false);
    };

    useEffect(() => { fetchOrders(); }, []);

    const changeStatus = (orderId, newStatus) => {
        setUpdateLoading(true);
        setTimeout(() => {
            const result = LocalDB.updateStatus(orderId, newStatus);
            setUpdateLoading(false);
            if (result.success) { alert(result.message); fetchOrders(); }
            else alert('Ошибка: ' + result.error);
        }, 150);
    };

    const handleStatusClick = (orderId, status) => {
        if (status === 'Завершен') setConfirmModal({ isOpen: true, orderId });
        else changeStatus(orderId, status);
    };

    const handleConfirmComplete = () => {
        changeStatus(confirmModal.orderId, 'Завершен');
        setConfirmModal({ isOpen: false, orderId: null });
    };

    if (loading) return <div style={{ textAlign: 'center', margin: '50px' }}>Загрузка заказов...</div>;

    const statuses = ['Новый', 'Приняли', 'Собираем', 'Готово к выдаче', 'Завершен'];

    return (
        <div className="admin-orders-container glass-panel">
            <h2 className="admin-title">Управление заказами (Админ)</h2>
            {orders.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'gray', margin: '20px 0' }}>Нет активных заказов.</p>
            ) : (
                <table className="orders-table">
                    <thead>
                        <tr><th>№</th><th>Дата</th><th>Покупатель / Тел.</th><th>Сумма</th><th>Состав</th><th>Статус</th></tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order.id}>
                                <td data-label="№">#{order.id}</td>
                                <td data-label="Дата">{new Date(order.created_at).toLocaleString('ru-RU')}</td>
                                <td data-label="Покупатель / Тел.">
                                    <strong>{order.user_name}</strong><br />
                                    <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{order.phone || 'Нет номера'}</span><br />
                                    <small style={{ color: 'gray' }}>{order.user_email}</small>
                                </td>
                                <td data-label="Сумма" style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                    {order.total_price} ₽<br />
                                    <small>{order.payment_method === 'card' ? 'Карта' : 'QR-код'}</small>
                                </td>
                                <td data-label="Состав">
                                    <ul className="order-items-list">
                                        {order.items.map((item, idx) => (
                                            <li key={idx}>{item.product_name || item.title} — {item.quantity} шт.</li>
                                        ))}
                                    </ul>
                                </td>
                                <td data-label="Статус">
                                    <div className="status-badge">{order.status}</div>
                                    <div className="status-actions">
                                        {statuses.map(status => (
                                            <button key={status}
                                                className={`status-btn ${order.status === status ? 'active' : ''}`}
                                                onClick={() => handleStatusClick(order.id, status)}
                                                disabled={updateLoading || order.status === status}>
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {confirmModal.isOpen && (
                <div className="modal-overlay" style={{ zIndex: 2000, background: 'transparent', backdropFilter: 'none' }}>
                    <div className="modal-content" style={{ maxWidth: '400px', padding: '40px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
                        <h2 style={{ color: 'var(--primary-color)', marginBottom: '20px' }}>Завершить заказ?</h2>
                        <p style={{ fontSize: '16px', marginBottom: '30px', color: '#555' }}>
                            Вы уверены, что хотите завершить заказ #{confirmModal.orderId}? Он исчезнет из списка активных заказов.
                        </p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button className="btn" onClick={handleConfirmComplete} disabled={updateLoading}>
                                {updateLoading ? 'Загрузка...' : 'Да'}
                            </button>
                            <button className="btn btn-outline" onClick={() => setConfirmModal({ isOpen: false, orderId: null })}>Нет</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ================= ГЛАВНЫЙ КОМПОНЕНТ ================= */
function App() {
    const [page, setPage] = useState('home');
    const [cart, setCart] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        LocalDB.init();
        const savedUser = localStorage.getItem('flower-current-user');
        if (savedUser) {
            const parsed = JSON.parse(savedUser);
            setCurrentUser({ ...parsed, id: parsed.id || parsed.user_id || parsed.id_user });
        }
        const savedCart = localStorage.getItem('flower-cart');
        if (savedCart) setCart(JSON.parse(savedCart));
    }, []);

    useEffect(() => { localStorage.setItem('flower-cart', JSON.stringify(cart)); }, [cart]);

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            return [...prev, { ...product, quantity: 1 }];
        });
        alert(`"${product.title}" добавлен в корзину!`);
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));
    const clearCart = () => setCart([]);
    const getTotal = () => cart.reduce((t, item) => t + (item.price * item.quantity), 0);
    const cartCount = cart.reduce((t, item) => t + item.quantity, 0);

    const loginUser = (user) => {
        setCurrentUser(user);
        localStorage.setItem('flower-current-user', JSON.stringify(user));
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('flower-current-user');
        setCart([]);
        localStorage.removeItem('flower-cart');
        setPage('home');
    };

    let content;
    if (page === 'home' || page === 'catalog') content = <HomePage addToCart={addToCart} />;
    else if (page === 'auth') content = <AuthPage loginUser={loginUser} setPage={setPage} />;
    else if (page === 'cart') content = <CartPage cart={cart} removeFromCart={removeFromCart} getTotal={getTotal} setPage={setPage} clearCart={clearCart} currentUser={currentUser} />;
    else if (page === 'user_orders') content = <UserOrdersPage currentUser={currentUser} />;
    else if (page === 'admin_orders') content = <AdminOrdersPage />;
    else content = <div className="not-found glass-panel"><h1>404</h1><p>Страница не найдена</p></div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <Header cartCount={cartCount} setPage={setPage} currentUser={currentUser} logout={logout} />
            <main className="container" style={{ flex: 1, paddingTop: '20px' }}>{content}</main>
            <footer className="footer"><p>© 2026 FlowerShop. Курсовая работа Олейникова М.В.</p></footer>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
