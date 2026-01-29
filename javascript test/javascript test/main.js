// =====================================================
// WANDERLUST - Main Application
// OOP-based Travel Planning Application
// =====================================================

// ==================== SWEETALERT2 FALLBACK ====================
// بعض المتصفحات (زي Edge مع Tracking Prevention) ممكن تمنع SweetAlert2 من الوصول للـ storage
// وده أحيانًا يعمل مشاكل في تحميله. هنا بنعمل fallback بسيط عشان التطبيق ما يقفش.
if (!window.Swal) {
  window.Swal = {
    fire: (options = {}) => {
      const title = options.title || '';
      const text = options.text || '';
      const message = [title, text].filter(Boolean).join('\n\n');

      if (options.showCancelButton) {
        const isConfirmed = window.confirm(message || 'Are you sure?');
        return Promise.resolve({ isConfirmed });
      }

      if (message) window.alert(message);
      return Promise.resolve({});
    }
  };
}

// ==================== API CONFIGURATION ====================
const API_CONFIG = {
  // Nager.Date API for countries and holidays
  nagerAPI: {
    baseURL: 'https://date.nager.at/api/v3',
    endpoints: {
      countries: '/AvailableCountries',
      holidays: '/PublicHolidays',
      countryInfo: '/CountryInfo'
    }
  },
  
  // REST Countries API for detailed country information
  restCountriesAPI: {
    baseURL: 'https://restcountries.com/v3.1',
    endpoints: {
      all: '/all',
      byCode: '/alpha'
    }
  }
};

// ==================== API SERVICE CLASS ====================
class APIService {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  async getCountries() {
    const cacheKey = 'wanderlust_countries_cache_v2';
    const cacheTtlMs = 1000 * 60 * 60 * 24 * 7; // 7 days

    // Check cache first
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0 && (Date.now() - parsed.savedAt) < cacheTtlMs) {
          console.log('✅ Using cached countries:', parsed.data.length);
          return parsed.data;
        }
      }
    } catch (e) {
      console.warn('Cache read error:', e);
    }

    // Try Nager.Date API first (simpler, faster, and reliable)
    try {
      console.log('🌐 Fetching countries from Nager.Date API...');
      const url = `${API_CONFIG.nagerAPI.baseURL}${API_CONFIG.nagerAPI.endpoints.countries}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Nager.Date API returned status ${response.status}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Nager.Date API returned invalid data');
      }

      // Transform Nager.Date format to match REST Countries format
      // Nager format: {"countryCode":"AD","name":"Andorra"}
      // REST Countries format: {"name":{"common":"Andorra"},"cca2":"AD","flags":{...}}
      const transformedData = data.map(country => ({
        name: { common: country.name },
        cca2: country.countryCode,
        flags: { 
          png: `https://flagcdn.com/w40/${country.countryCode.toLowerCase()}.png`,
          svg: `https://flagcdn.com/${country.countryCode.toLowerCase()}.svg`
        },
        capital: []
      }));

      console.log('✅ Successfully fetched', transformedData.length, 'countries from Nager.Date API');

      // Cache the transformed data
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), data: transformedData }));
      } catch (e) {
        console.warn('Cache write error:', e);
      }

      return transformedData;
    } catch (error) {
      console.error('❌ Nager.Date API failed:', error.message);
      console.log('Trying REST Countries API as fallback...');
    }

    // Try REST Countries API as fallback
    try {
      console.log('🌐 Fetching countries from REST Countries API...');
      const response = await fetch(`https://restcountries.com/v3.1/all?fields=name,cca2,flags,capital`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`REST Countries API returned status ${response.status}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('REST Countries API returned invalid data');
      }

      console.log('✅ Successfully fetched', data.length, 'countries from REST Countries API');

      // Cache the data
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), data }));
      } catch (e) {
        console.warn('Cache write error:', e);
      }

      return data;
    } catch (error) {
      console.error('❌ All APIs failed:', error.message);
      console.log('📦 Using mock countries as fallback (37 countries)');
      return this.getMockCountries();
    }
  }

  getMockCountries() {
    // قائمة بسيطة تكفي للـ Dashboard في حالة فشل الـ API
    return [
      { name: { common: 'Åland Islands' }, cca2: 'AX', flags: { png: 'https://flagcdn.com/w40/ax.png' }, capital: ['Mariehamn'] },
      { name: { common: 'Albania' }, cca2: 'AL', flags: { png: 'https://flagcdn.com/w40/al.png' }, capital: ['Tirana'] },
      { name: { common: 'Andorra' }, cca2: 'AD', flags: { png: 'https://flagcdn.com/w40/ad.png' }, capital: ['Andorra la Vella'] },
      { name: { common: 'Argentina' }, cca2: 'AR', flags: { png: 'https://flagcdn.com/w40/ar.png' }, capital: ['Buenos Aires'] },
      { name: { common: 'Armenia' }, cca2: 'AM', flags: { png: 'https://flagcdn.com/w40/am.png' }, capital: ['Yerevan'] },
      { name: { common: 'Australia' }, cca2: 'AU', flags: { png: 'https://flagcdn.com/w40/au.png' }, capital: ['Canberra'] },
      { name: { common: 'Austria' }, cca2: 'AT', flags: { png: 'https://flagcdn.com/w40/at.png' }, capital: ['Vienna'] },
      { name: { common: 'Belgium' }, cca2: 'BE', flags: { png: 'https://flagcdn.com/w40/be.png' }, capital: ['Brussels'] },
      { name: { common: 'Brazil' }, cca2: 'BR', flags: { png: 'https://flagcdn.com/w40/br.png' }, capital: ['Brasília'] },
      { name: { common: 'Canada' }, cca2: 'CA', flags: { png: 'https://flagcdn.com/w40/ca.png' }, capital: ['Ottawa'] },
      { name: { common: 'China' }, cca2: 'CN', flags: { png: 'https://flagcdn.com/w40/cn.png' }, capital: ['Beijing'] },
      { name: { common: 'Denmark' }, cca2: 'DK', flags: { png: 'https://flagcdn.com/w40/dk.png' }, capital: ['Copenhagen'] },
      { name: { common: 'Egypt' }, cca2: 'EG', flags: { png: 'https://flagcdn.com/w40/eg.png' }, capital: ['Cairo'] },
      { name: { common: 'Finland' }, cca2: 'FI', flags: { png: 'https://flagcdn.com/w40/fi.png' }, capital: ['Helsinki'] },
      { name: { common: 'France' }, cca2: 'FR', flags: { png: 'https://flagcdn.com/w40/fr.png' }, capital: ['Paris'] },
      { name: { common: 'Germany' }, cca2: 'DE', flags: { png: 'https://flagcdn.com/w40/de.png' }, capital: ['Berlin'] },
      { name: { common: 'Greece' }, cca2: 'GR', flags: { png: 'https://flagcdn.com/w40/gr.png' }, capital: ['Athens'] },
      { name: { common: 'India' }, cca2: 'IN', flags: { png: 'https://flagcdn.com/w40/in.png' }, capital: ['New Delhi'] },
      { name: { common: 'Ireland' }, cca2: 'IE', flags: { png: 'https://flagcdn.com/w40/ie.png' }, capital: ['Dublin'] },
      { name: { common: 'Italy' }, cca2: 'IT', flags: { png: 'https://flagcdn.com/w40/it.png' }, capital: ['Rome'] },
      { name: { common: 'Japan' }, cca2: 'JP', flags: { png: 'https://flagcdn.com/w40/jp.png' }, capital: ['Tokyo'] },
      { name: { common: 'Mexico' }, cca2: 'MX', flags: { png: 'https://flagcdn.com/w40/mx.png' }, capital: ['Mexico City'] },
      { name: { common: 'Netherlands' }, cca2: 'NL', flags: { png: 'https://flagcdn.com/w40/nl.png' }, capital: ['Amsterdam'] },
      { name: { common: 'Norway' }, cca2: 'NO', flags: { png: 'https://flagcdn.com/w40/no.png' }, capital: ['Oslo'] },
      { name: { common: 'Poland' }, cca2: 'PL', flags: { png: 'https://flagcdn.com/w40/pl.png' }, capital: ['Warsaw'] },
      { name: { common: 'Portugal' }, cca2: 'PT', flags: { png: 'https://flagcdn.com/w40/pt.png' }, capital: ['Lisbon'] },
      { name: { common: 'Russia' }, cca2: 'RU', flags: { png: 'https://flagcdn.com/w40/ru.png' }, capital: ['Moscow'] },
      { name: { common: 'Saudi Arabia' }, cca2: 'SA', flags: { png: 'https://flagcdn.com/w40/sa.png' }, capital: ['Riyadh'] },
      { name: { common: 'South Africa' }, cca2: 'ZA', flags: { png: 'https://flagcdn.com/w40/za.png' }, capital: ['Pretoria'] },
      { name: { common: 'South Korea' }, cca2: 'KR', flags: { png: 'https://flagcdn.com/w40/kr.png' }, capital: ['Seoul'] },
      { name: { common: 'Spain' }, cca2: 'ES', flags: { png: 'https://flagcdn.com/w40/es.png' }, capital: ['Madrid'] },
      { name: { common: 'Sweden' }, cca2: 'SE', flags: { png: 'https://flagcdn.com/w40/se.png' }, capital: ['Stockholm'] },
      { name: { common: 'Switzerland' }, cca2: 'CH', flags: { png: 'https://flagcdn.com/w40/ch.png' }, capital: ['Bern'] },
      { name: { common: 'Turkey' }, cca2: 'TR', flags: { png: 'https://flagcdn.com/w40/tr.png' }, capital: ['Ankara'] },
      { name: { common: 'United Arab Emirates' }, cca2: 'AE', flags: { png: 'https://flagcdn.com/w40/ae.png' }, capital: ['Abu Dhabi'] },
      { name: { common: 'United Kingdom' }, cca2: 'GB', flags: { png: 'https://flagcdn.com/w40/gb.png' }, capital: ['London'] },
      { name: { common: 'United States' }, cca2: 'US', flags: { png: 'https://flagcdn.com/w40/us.png' }, capital: ['Washington, D.C.'] }
    ];
  }

  async getHolidays(countryCode, year) {
    // Try to fetch from Nager.Date API, fallback to mock data if fails
    try {
      const url = `${API_CONFIG.nagerAPI.baseURL}${API_CONFIG.nagerAPI.endpoints.holidays}/${year}/${countryCode}`;
      console.log('🌐 Fetching holidays from Nager.Date API...');
      const response = await fetch(url);
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim()) {
          try {
            const data = JSON.parse(text);
            console.log(`✅ Successfully fetched ${data.length} holidays for ${countryCode}`);
            return data;
          } catch (parseError) {
            console.warn('Failed to parse holidays JSON, using mock data');
            return this.getMockHolidays(countryCode, year);
          }
        } else {
          return this.getMockHolidays(countryCode, year);
        }
      }
      return this.getMockHolidays(countryCode, year);
    } catch (error) {
      console.warn('Error fetching holidays, using mock data:', error.message);
      return this.getMockHolidays(countryCode, year);
    }
  }

  getMockHolidays(countryCode, year) {
    // Mock holidays data for different countries
    const mockHolidays = {
      'EG': [
        { date: `${year}-01-01`, name: 'New Year\'s Day', localName: 'رأس السنة', global: true },
        { date: `${year}-01-07`, name: 'Coptic Christmas', localName: 'عيد الميلاد القبطي', global: false },
        { date: `${year}-01-25`, name: 'Revolution Day', localName: 'عيد الثورة', global: false },
        { date: `${year}-04-25`, name: 'Sinai Liberation Day', localName: 'عيد تحرير سيناء', global: false },
        { date: `${year}-05-01`, name: 'Labour Day', localName: 'عيد العمال', global: true },
        { date: `${year}-06-30`, name: 'June 30 Revolution', localName: 'ثورة 30 يونيو', global: false },
        { date: `${year}-07-23`, name: 'Revolution Day', localName: 'عيد الثورة', global: false },
        { date: `${year}-10-06`, name: 'Armed Forces Day', localName: 'عيد القوات المسلحة', global: false }
      ],
      'SA': [
        { date: `${year}-01-01`, name: 'New Year\'s Day', localName: 'رأس السنة', global: true },
        { date: `${year}-02-22`, name: 'Founding Day', localName: 'يوم التأسيس', global: false },
        { date: `${year}-09-23`, name: 'National Day', localName: 'اليوم الوطني', global: false }
      ],
      'AE': [
        { date: `${year}-01-01`, name: 'New Year\'s Day', localName: 'رأس السنة', global: true },
        { date: `${year}-12-02`, name: 'National Day', localName: 'اليوم الوطني', global: false }
      ],
      'US': [
        { date: `${year}-01-01`, name: 'New Year\'s Day', localName: 'New Year\'s Day', global: true },
        { date: `${year}-07-04`, name: 'Independence Day', localName: 'Independence Day', global: false },
        { date: `${year}-12-25`, name: 'Christmas Day', localName: 'Christmas Day', global: true }
      ],
      'GB': [
        { date: `${year}-01-01`, name: 'New Year\'s Day', localName: 'New Year\'s Day', global: true },
        { date: `${year}-12-25`, name: 'Christmas Day', localName: 'Christmas Day', global: true },
        { date: `${year}-12-26`, name: 'Boxing Day', localName: 'Boxing Day', global: false }
      ],
      'AR': [
        { date: `${year}-01-01`, name: 'New Year\'s Day', localName: 'Año Nuevo', global: true },
        { date: `${year}-05-01`, name: 'Labour Day', localName: 'Día del Trabajador', global: true },
        { date: `${year}-05-25`, name: 'May Revolution Day', localName: 'Día de la Revolución de Mayo', global: false },
        { date: `${year}-07-09`, name: 'Independence Day', localName: 'Día de la Independencia', global: false },
        { date: `${year}-12-25`, name: 'Christmas Day', localName: 'Navidad', global: true }
      ]
    };

    // Return holidays for the country, or default Egypt holidays
    return mockHolidays[countryCode] || mockHolidays['EG'];
  }

  async getEvents(city, country) {
    // Using Ticketmaster API or similar
    // For demo, we'll return mock data
    try {
      // Mock events - in production, use actual API
      return this.getMockEvents(city);
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  getMockEvents(city) {
    // Mock events data with real placeholder images
    const categoryData = {
      'Music': {
        images: [
          'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=200&fit=crop',
          'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=200&fit=crop'
        ],
        venues: ['Concert Hall', 'Opera House', 'Music Arena']
      },
      'Sports': {
        images: [
          'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=200&fit=crop',
          'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=200&fit=crop'
        ],
        venues: ['Stadium', 'Sports Arena', 'Athletic Center']
      },
      'Arts': {
        images: [
          'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&h=200&fit=crop',
          'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=200&fit=crop'
        ],
        venues: ['Art Gallery', 'Cultural Center', 'Exhibition Hall']
      },
      'Theatre': {
        images: [
          'https://images.unsplash.com/photo-1503095396549-807759245b35?w=400&h=200&fit=crop',
          'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=400&h=200&fit=crop'
        ],
        venues: ['Theatre', 'Playhouse', 'Performance Hall']
      },
      'Comedy': {
        images: [
          'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=400&h=200&fit=crop',
          'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=200&fit=crop'
        ],
        venues: ['Comedy Club', 'Entertainment Center', 'Comedy Theatre']
      }
    };
    
    const categories = Object.keys(categoryData);
    const events = [];
    
    for (let i = 0; i < 8; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const catData = categoryData[category];
      const venue = catData.venues[Math.floor(Math.random() * catData.venues.length)];
      const image = catData.images[i % catData.images.length];
      const date = new Date();
      date.setDate(date.getDate() + Math.floor(Math.random() * 60));
      
      events.push({
        id: `event-${i}`,
        title: `${category} Event in ${city}`,
        date: date.toISOString().split('T')[0],
        time: `${18 + Math.floor(Math.random() * 4)}:00`,
        location: `${venue}, ${city}`,
        category: category,
        image: image
      });
    }
    
    return events;
  }

  async getWeather(city, countryCode) {
    try {
      // Using Open-Meteo API (free, no API key required)
      console.log('🌤️ Fetching weather for:', city);
      
      // First, get coordinates for the city using geocoding
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
      );
      
      if (!geoResponse.ok) {
        console.warn('Geocoding failed, using mock data');
        return this.getMockWeather(city);
      }
      
      const geoData = await geoResponse.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        console.warn('City not found, using mock data');
        return this.getMockWeather(city);
      }
      
      const { latitude, longitude } = geoData.results[0];
      
      // Get weather data
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`
      );
      
      if (!weatherResponse.ok) {
        console.warn('Weather API failed, using mock data');
        return this.getMockWeather(city);
      }
      
      const weatherData = await weatherResponse.json();
      const current = weatherData.current;
      const daily = weatherData.daily;
      
      // Weather code to condition mapping
      const getCondition = (code) => {
        if (code === 0) return 'Clear sky';
        if (code <= 3) return 'Partly cloudy';
        if (code <= 48) return 'Cloudy';
        if (code <= 67) return 'Rainy';
        if (code <= 77) return 'Snowy';
        if (code <= 99) return 'Stormy';
        return 'Partly cloudy';
      };
      
      const weather = {
        location: city,
        current: {
          temp: Math.round(current.temperature_2m),
          feelsLike: Math.round(current.apparent_temperature),
          condition: getCondition(current.weather_code),
          humidity: current.relative_humidity_2m,
          windSpeed: Math.round(current.wind_speed_10m),
          uvIndex: Math.round(current.uv_index || 0),
          precipitation: Math.round(current.precipitation || 0)
        },
        forecast: []
      };
      
      // Add 7-day forecast
      for (let i = 0; i < 7; i++) {
        const date = new Date(daily.time[i]);
        weather.forecast.push({
          date: daily.time[i],
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          tempMax: Math.round(daily.temperature_2m_max[i]),
          tempMin: Math.round(daily.temperature_2m_min[i]),
          condition: getCondition(daily.weather_code[i]),
          precipitation: daily.precipitation_probability_max[i] || 0
        });
      }
      
      console.log('✅ Weather data loaded:', weather);
      return weather;
      
    } catch (error) {
      console.error('Error fetching weather:', error);
      return this.getMockWeather(city);
    }
  }

  getMockWeather(city) {
    const conditions = ['Clear sky', 'Partly cloudy', 'Cloudy', 'Sunny'];
    const weather = {
      location: city,
      current: {
        temp: 20 + Math.floor(Math.random() * 10),
        feelsLike: 19 + Math.floor(Math.random() * 10),
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        humidity: 40 + Math.floor(Math.random() * 30),
        windSpeed: 10 + Math.floor(Math.random() * 15),
        uvIndex: 3 + Math.floor(Math.random() * 5),
        precipitation: Math.floor(Math.random() * 30)
      },
      forecast: []
    };

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      weather.forecast.push({
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        tempMax: 20 + Math.floor(Math.random() * 10),
        tempMin: 10 + Math.floor(Math.random() * 5),
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        precipitation: Math.floor(Math.random() * 30)
      });
    }

    return weather;
  }

  async getCurrencyRates(baseCurrency = 'USD') {
    // Using ExchangeRate API or similar
    try {
      // Using exchangerate-api.com (free tier)
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
      if (response.ok) {
        const data = await response.json();
        return data.rates;
      }
      return this.getMockRates();
    } catch (error) {
      console.error('Error fetching currency rates:', error);
      return this.getMockRates();
    }
  }

  getMockRates() {
    return {
      USD: 1,
      EUR: 0.92,
      GBP: 0.79,
      EGP: 30.90,
      AED: 3.67,
      SAR: 3.75,
      JPY: 148.50,
      CAD: 1.35,
      INR: 83.10
    };
  }

  async getCountryInfo(countryCode) {
    try {
      const fields = encodeURIComponent([
        'name',
        'cca2',
        'flags',
        'capital',
        'population',
        'area',
        'region',
        'subregion',
        'currencies',
        'languages',
        'borders',
        'idd',
        'car',
        'startOfWeek',
        'timezones'
      ].join(','));
      const response = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}?fields=${fields}`);
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim()) {
          try {
            return JSON.parse(text);
          } catch (parseError) {
            console.warn('Failed to parse country info JSON, using mock data');
            return this.getMockCountryInfo(countryCode);
          }
        } else {
          return this.getMockCountryInfo(countryCode);
        }
      }
      return this.getMockCountryInfo(countryCode);
    } catch (error) {
      console.warn('Error fetching country info, using mock data:', error.message);
      return this.getMockCountryInfo(countryCode);
    }
  }

  getMockCountryInfo(countryCode) {
    // Get country info from mock countries list
    const mockCountries = this.getMockCountries();
    const country = mockCountries.find(c => c.cca2 === countryCode);
    return country || mockCountries[0]; // Return Egypt as fallback
  }
}

// ==================== STATE MANAGER CLASS ====================
class StateManager {
  constructor() {
    this.state = {
      selectedCountry: null,
      selectedCity: null,
      selectedYear: new Date().getFullYear(),
      countryInfo: null,
      holidays: [],
      events: [],
      weather: null,
      savedPlans: this.loadPlans()
    };
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  getState() {
    return this.state;
  }

  loadPlans() {
    try {
      const plans = localStorage.getItem('wanderlust_plans');
      return plans ? JSON.parse(plans) : [];
    } catch (error) {
      console.error('Error loading plans:', error);
      return [];
    }
  }

  savePlan(plan) {
    const plans = [...this.state.savedPlans, plan];
    this.setState({ savedPlans: plans });
    localStorage.setItem('wanderlust_plans', JSON.stringify(plans));
  }

  deletePlan(planId) {
    const plans = this.state.savedPlans.filter(p => p.id !== planId);
    this.setState({ savedPlans: plans });
    localStorage.setItem('wanderlust_plans', JSON.stringify(plans));
  }

  clearAllPlans() {
    this.setState({ savedPlans: [] });
    localStorage.removeItem('wanderlust_plans');
  }
}

// ==================== ROUTER CLASS ====================
class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = 'dashboard';
    this.init();
  }

  init() {
    // Handle browser back/forward فقط
    // هنسيب استدعاء handleRoute لأول مرة للتطبيق بعد ما يجهّز كل الـ routes
    window.addEventListener('popstate', () => {
      this.handleRoute();
    });
  }

  register(path, handler) {
    this.routes[path] = handler;
  }

  navigate(path) {
    if (path !== this.currentRoute) {
      this.currentRoute = path;
      // Hash routing to avoid 404 on static servers (Live Server / GitHub Pages)
      window.location.hash = `#/${path}`;
      this.handleRoute();
    }
  }

  handleRoute() {
    // Hash routing: #/weather, #/holidays ...
    const hash = window.location.hash || '';
    const path = hash.startsWith('#/') ? hash.slice(2) : (hash.startsWith('#') ? hash.slice(1) : '');
    const route = path || 'dashboard';
    this.currentRoute = route;
    
    console.log('🧭 Navigating to:', route, '| Hash:', hash);
    
    if (this.routes[route]) {
      this.routes[route]();
    } else {
      console.warn('⚠️ Route not found:', route, '- falling back to dashboard');
      this.routes['dashboard']();
    }
  }

  getCurrentRoute() {
    return this.currentRoute;
  }
}

// ==================== VIEW BASE CLASS ====================
class View {
  constructor(id, stateManager, apiService) {
    this.id = id;
    this.element = document.getElementById(`${id}-view`);
    this.stateManager = stateManager;
    this.apiService = apiService;
    this.isRendering = false;
    this.lastRenderTime = 0;
  }

  show() {
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
    });
    if (this.element) {
      this.element.classList.add('active');
      console.log('👁️ Showing view:', this.id);
    } else {
      console.error('❌ View element not found:', `${this.id}-view`);
    }
  }

  hide() {
    if (this.element) {
      this.element.classList.remove('active');
    }
  }

  render() {
    // Override in subclasses
  }

  update() {
    // Override in subclasses
  }
}

// ==================== DASHBOARD VIEW ====================
class DashboardView extends View {
  constructor(stateManager, apiService) {
    super('dashboard', stateManager, apiService);
    this.init();
  }

  init() {
    console.log('🚀 DashboardView initializing...');
    this.loadCountries();
    this.setupEventListeners();
    this.updateStats();
    
    // Extra safeguard: retry loading countries after a short delay if needed
    setTimeout(() => {
      const countrySelect = document.getElementById('global-country');
      if (countrySelect && countrySelect.options.length <= 1) {
        console.warn('⚠️ Countries not loaded, retrying...');
        this.loadCountries();
      }
    }, 1000);
  }

  async loadCountries() {
    try {
      const countries = await this.apiService.getCountries();
      console.log('Countries loaded:', countries.length, 'countries');
      
      const countrySelect = document.getElementById('global-country');
      
      if (!countrySelect) {
        console.error('Country select element not found!');
        return;
      }
      
      if (!countries || countries.length === 0) {
        console.error('No countries data available!');
        return;
      }
      
      countrySelect.innerHTML = '<option value="">Select Country</option>';
      countries
        .sort((a, b) => a.name.common.localeCompare(b.name.common))
        .forEach(country => {
          const option = document.createElement('option');
          option.value = country.cca2;
          option.textContent = `${country.cca2 === 'EG' ? '🇪🇬' : this.getFlagEmoji(country.cca2)} ${country.name.common}`;
          countrySelect.appendChild(option);
        });

      // Enhance the country select to searchable dropdown (like demo)
      this.enhanceCountrySelect(countrySelect, countries);
      console.log('Country select enhanced successfully');
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  }

  enhanceCountrySelect(countrySelect, countries) {
    // avoid double-init
    if (countrySelect.dataset.enhanced === 'true') {
      console.warn('⚠️ Country select already enhanced, skipping...');
      return;
    }
    countrySelect.dataset.enhanced = 'true';

    console.log('🎨 Enhancing country select with', countries.length, 'countries');
    console.log('📋 First 5 countries:', countries.slice(0, 5).map(c => c.name.common));

    // hide native select but keep it in DOM for form/state
    countrySelect.classList.add('wl-native-select-hidden');

    const wrapper = document.createElement('div');
    wrapper.className = 'wl-country-select';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'wl-country-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const triggerText = document.createElement('span');
    triggerText.className = 'wl-country-trigger-text';
    trigger.appendChild(triggerText);

    const triggerChevron = document.createElement('span');
    triggerChevron.className = 'wl-country-trigger-chevron';
    triggerChevron.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
    trigger.appendChild(triggerChevron);

    const panel = document.createElement('div');
    panel.className = 'wl-country-panel hidden';

    const searchWrap = document.createElement('div');
    searchWrap.className = 'wl-country-search';
    searchWrap.innerHTML = `
      <i class="fa-solid fa-magnifying-glass"></i>
      <input type="text" placeholder="Search countries..." autocomplete="off" />
    `;
    panel.appendChild(searchWrap);

    const list = document.createElement('div');
    list.className = 'wl-country-list';
    list.setAttribute('role', 'listbox');
    panel.appendChild(list);

    wrapper.appendChild(trigger);
    wrapper.appendChild(panel);

    // insert wrapper before select, then move select into wrapper (keeps layout)
    countrySelect.parentElement?.insertBefore(wrapper, countrySelect);
    wrapper.appendChild(countrySelect);

    const buildList = (filterText = '') => {
      const q = filterText.trim().toLowerCase();
      const filtered = !q
        ? countries
        : countries.filter(c => {
            const name = (c?.name?.common || '').toLowerCase();
            const code = (c?.cca2 || '').toLowerCase();
            return name.includes(q) || code.includes(q);
          });

      console.log('Building country list with', filtered.length, 'countries');
      
      list.innerHTML = filtered.map(c => {
        const code = c.cca2;
        const name = c.name.common;
        const flagUrl = c.flags?.png || `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
        const selected = countrySelect.value === code ? 'true' : 'false';
        return `
          <button type="button"
                  class="wl-country-item"
                  role="option"
                  aria-selected="${selected}"
                  data-code="${code}">
            <img src="${flagUrl}" alt="${name}" class="wl-country-flag">
            <span class="wl-country-name">${name}</span>
            <span class="wl-country-code">${code}</span>
          </button>
        `;
      }).join('');
    };

    const syncTrigger = () => {
      const code = countrySelect.value;
      if (!code) {
        triggerText.textContent = 'Select Country';
        return;
      }
      const c = countries.find(x => x.cca2 === code);
      const name = c?.name?.common || code;
      const flagUrl = c?.flags?.png || `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
      triggerText.innerHTML = `<img src="${flagUrl}" alt="${name}" class="wl-country-flag"><span>${name}</span>`;
    };

    const open = () => {
      panel.classList.remove('hidden');
      trigger.setAttribute('aria-expanded', 'true');
      buildList(searchInput.value);
      // focus search
      searchInput.focus();
      searchInput.select();
    };
    const close = () => {
      panel.classList.add('hidden');
      trigger.setAttribute('aria-expanded', 'false');
    };
    const toggle = () => (panel.classList.contains('hidden') ? open() : close());

    const searchInput = searchWrap.querySelector('input');
    searchInput.addEventListener('input', () => buildList(searchInput.value));

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      toggle();
    });

    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.wl-country-item');
      if (!btn) return;
      const code = btn.getAttribute('data-code');
      countrySelect.value = code;
      countrySelect.dispatchEvent(new Event('change', { bubbles: true }));
      syncTrigger();
      close();
    });

    // close when clicking outside
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) close();
    });

    // initial value: prefer EG if available
    if (!countrySelect.value) {
      const hasEG = countries.some(c => c.cca2 === 'EG');
      if (hasEG) countrySelect.value = 'EG';
    }
    syncTrigger();
  }

  getFlagEmoji(countryCode) {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  }

  setupEventListeners() {
    const searchBtn = document.getElementById('global-search-btn');
    const countrySelect = document.getElementById('global-country');
    const citySelect = document.getElementById('global-city');
    const yearSelect = document.getElementById('global-year');
    const clearBtn = document.getElementById('clear-selection-btn');

    if (searchBtn) {
      searchBtn.addEventListener('click', () => this.handleSearch());
    }

    if (countrySelect) {
      countrySelect.addEventListener('change', () => this.handleCountryChange());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearSelection());
    }
  }

  async handleCountryChange() {
    const countrySelect = document.getElementById('global-country');
    const citySelect = document.getElementById('global-city');
    const countryCode = countrySelect?.value;

    if (!countryCode) {
      // Clear selection if no country selected
      this.clearSelection();
      return;
    }

    try {
      // Show loading
      this.showLoading('Loading country information...');
      
      const countryInfo = await this.apiService.getCountryInfo(countryCode);
      
      if (countryInfo) {
        // Update cities based on country
        if (citySelect) {
          citySelect.innerHTML = '';
          if (countryInfo.capital && countryInfo.capital[0]) {
            const option = document.createElement('option');
            option.value = countryInfo.capital[0];
            option.textContent = countryInfo.capital[0];
            option.selected = true;
            citySelect.appendChild(option);
          }
        }
        
        // Update state with new country selection
        const city = countryInfo.capital?.[0] || '';
        const year = parseInt(document.getElementById('global-year')?.value || new Date().getFullYear());
        
        this.stateManager.setState({
          selectedCountry: countryCode,
          selectedCity: city,
          selectedYear: year,
          countryInfo: countryInfo
        });
        
        // Update the display
        this.updateCountryInfo(countryInfo);
        this.updateSelectedDestination(countryCode, city, countryInfo);
        
        // Load country data (holidays, etc.)
        await this.loadCountryData(countryCode, year);
        this.updateStats();
        
        this.hideLoading();
        
        console.log('✅ Country changed to:', countryInfo.name?.common || countryCode);
      }
    } catch (error) {
      console.error('Error loading country:', error);
      this.hideLoading();
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load country information'
      });
    }
  }

  async handleSearch() {
    const countrySelect = document.getElementById('global-country');
    const citySelect = document.getElementById('global-city');
    const yearSelect = document.getElementById('global-year');

    const countryCode = countrySelect?.value;
    const city = citySelect?.value;
    const year = parseInt(yearSelect?.value || new Date().getFullYear());

    if (!countryCode || !city) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please select both country and city'
      });
      return;
    }

    this.showLoading('Loading country information...');

    try {
      const countryInfo = await this.apiService.getCountryInfo(countryCode);
      
      this.stateManager.setState({
        selectedCountry: countryCode,
        selectedCity: city,
        selectedYear: year,
        countryInfo: countryInfo
      });

      await this.loadCountryData(countryCode, year);
      this.updateCountryInfo(countryInfo);
      this.updateSelectedDestination(countryCode, city, countryInfo);
      this.updateStats();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load country information'
      });
    } finally {
      this.hideLoading();
    }
  }

  async loadCountryData(countryCode, year) {
    try {
      const [holidays] = await Promise.all([
        this.apiService.getHolidays(countryCode, year)
      ]);

      this.stateManager.setState({ holidays });
    } catch (error) {
      console.error('Error loading country data:', error);
    }
  }

  updateCountryInfo(countryInfo) {
    if (!countryInfo) {
      console.warn('⚠️ updateCountryInfo called with no country info');
      return;
    }

    const infoSection = document.getElementById('dashboard-country-info');
    if (!infoSection) {
      console.error('❌ dashboard-country-info element not found!');
      return;
    }

    console.log('🌍 Updating country info for:', countryInfo.name?.common);

    const flagUrl = countryInfo.flags?.png || `https://flagcdn.com/w160/${countryInfo.cca2?.toLowerCase()}.png`;
    const countryName = countryInfo.name?.common || 'Unknown';
    const officialName = countryInfo.name?.official || countryName;
    const capital = countryInfo.capital?.[0] || 'N/A';
    const population = countryInfo.population?.toLocaleString() || 'N/A';
    const area = countryInfo.area ? `${countryInfo.area.toLocaleString()} km²` : 'N/A';
    const region = countryInfo.region || 'N/A';
    const subregion = countryInfo.subregion || '';
    const continent = region;
    const callingCode = countryInfo.idd?.root ? `${countryInfo.idd.root}${countryInfo.idd.suffixes?.[0] || ''}` : 'N/A';
    const drivingSide = countryInfo.car?.side || 'N/A';
    const weekStarts = countryInfo.startOfWeek || 'Monday';

    const currencies = countryInfo.currencies ? Object.entries(countryInfo.currencies).map(([code, curr]) => 
      `${curr.name} (${code} ${curr.symbol || ''})`
    ).join(', ') : 'N/A';

    const languages = countryInfo.languages ? Object.values(countryInfo.languages).join(', ') : 'N/A';

    const neighbors = countryInfo.borders || [];

    infoSection.innerHTML = `
      <div class="dashboard-country-header">
        <img src="${flagUrl}" alt="${countryName}" class="dashboard-country-flag">
        <div class="dashboard-country-title">
          <h3>${countryName}</h3>
          <p class="official-name">${officialName}</p>
          <span class="region"><i class="fa-solid fa-location-dot"></i> ${region}${subregion ? ` • ${subregion}` : ''}</span>
        </div>
      </div>
      
      <div class="dashboard-local-time">
        <div class="local-time-display">
          <i class="fa-solid fa-clock"></i>
          <span class="local-time-value" id="country-local-time">--:--:--</span>
          <span class="local-time-zone">${countryInfo.timezones?.[0] || 'UTC'}</span>
        </div>
      </div>
      
      <div class="dashboard-country-grid">
        <div class="dashboard-country-detail">
          <i class="fa-solid fa-building-columns"></i>
          <span class="label">Capital</span>
          <span class="value">${capital}</span>
        </div>
        <div class="dashboard-country-detail">
          <i class="fa-solid fa-users"></i>
          <span class="label">Population</span>
          <span class="value">${population}</span>
        </div>
        <div class="dashboard-country-detail">
          <i class="fa-solid fa-ruler-combined"></i>
          <span class="label">Area</span>
          <span class="value">${area}</span>
        </div>
        <div class="dashboard-country-detail">
          <i class="fa-solid fa-globe"></i>
          <span class="label">Continent</span>
          <span class="value">${continent}</span>
        </div>
        <div class="dashboard-country-detail">
          <i class="fa-solid fa-phone"></i>
          <span class="label">Calling Code</span>
          <span class="value">${callingCode}</span>
        </div>
        <div class="dashboard-country-detail">
          <i class="fa-solid fa-car"></i>
          <span class="label">Driving Side</span>
          <span class="value">${drivingSide}</span>
        </div>
        <div class="dashboard-country-detail">
          <i class="fa-solid fa-calendar-week"></i>
          <span class="label">Week Starts</span>
          <span class="value">${weekStarts}</span>
        </div>
      </div>
      
      <div class="dashboard-country-extras">
        <div class="dashboard-country-extra">
          <h4><i class="fa-solid fa-coins"></i> Currency</h4>
          <div class="extra-tags">
            <span class="extra-tag">${currencies}</span>
          </div>
        </div>
        <div class="dashboard-country-extra">
          <h4><i class="fa-solid fa-language"></i> Languages</h4>
          <div class="extra-tags">
            <span class="extra-tag">${languages}</span>
          </div>
        </div>
        ${neighbors.length > 0 ? `
        <div class="dashboard-country-extra">
          <h4><i class="fa-solid fa-map-location-dot"></i> Neighbors</h4>
          <div class="extra-tags">
            ${neighbors.map(code => `<span class="extra-tag border-tag">${code}</span>`).join('')}
          </div>
        </div>
        ` : ''}
      </div>
      
      <div class="dashboard-country-actions">
        <a href="https://www.google.com/maps/place/${countryName}" target="_blank" class="btn-map-link">
          <i class="fa-solid fa-map"></i> View on Google Maps
        </a>
      </div>
    `;

    // Update local time
    this.updateLocalTime(countryInfo.timezones?.[0]);
  }

  updateLocalTime(timezone) {
    const timeElement = document.getElementById('country-local-time');
    if (!timeElement) return;

    // Validate timezone - must be IANA format (e.g., "Africa/Cairo", not "UTC+02:00")
    const isValidTimezone = (tz) => {
      if (!tz || typeof tz !== 'string') return false;
      // Skip invalid formats like "UTC+02:00" or "UTC-05:00"
      if (tz.match(/^UTC[+-]\d/)) return false;
      
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    };

    if (!isValidTimezone(timezone)) {
      console.warn('Invalid timezone format:', timezone, '- using UTC as fallback');
      timezone = 'UTC';
    }

    const updateTime = () => {
      try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        timeElement.textContent = formatter.format(now);
      } catch (error) {
        console.error('Error updating time:', error);
        timeElement.textContent = new Date().toLocaleTimeString('en-US');
      }
    };

    updateTime();
    
    // Clear any existing interval
    if (this.timeInterval) clearInterval(this.timeInterval);
    this.timeInterval = setInterval(updateTime, 1000);
  }

  updateSelectedDestination(countryCode, city, countryInfo) {
    const destinationDiv = document.getElementById('selected-destination');
    if (!destinationDiv) return;

    const flagUrl = countryInfo?.flags?.png || `https://flagcdn.com/w80/${countryCode?.toLowerCase()}.png`;
    const countryName = countryInfo?.name?.common || countryCode;

    destinationDiv.innerHTML = `
      <div class="selected-flag">
        <img id="selected-country-flag" src="${flagUrl}" alt="${countryName}">
      </div>
      <div class="selected-info">
        <span class="selected-country-name" id="selected-country-name">${countryName}</span>
        <span class="selected-city-name" id="selected-city-name">• ${city}</span>
      </div>
      <button class="clear-selection-btn" id="clear-selection-btn">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    document.getElementById('clear-selection-btn')?.addEventListener('click', () => this.clearSelection());
  }

  clearSelection() {
    this.stateManager.setState({
      selectedCountry: null,
      selectedCity: null,
      countryInfo: null
    });

    const destinationDiv = document.getElementById('selected-destination');
    if (destinationDiv) {
      destinationDiv.style.display = 'none';
    }

    const infoSection = document.getElementById('dashboard-country-info-section');
    if (infoSection) {
      const infoContent = document.getElementById('dashboard-country-info');
      if (infoContent) {
        infoContent.innerHTML = `
          <div style="text-align: center; padding: 40px;">
            <p style="color: var(--slate-500); font-size: 16px;">
              Select a country above and click <strong>Explore</strong> to see detailed information
            </p>
          </div>
        `;
      }
    }
  }

  updateStats() {
    const state = this.stateManager.getState();
    const holidaysCount = state.holidays?.length || 0;
    const savedCount = state.savedPlans?.length || 0;

    console.log('📊 Updating stats - Holidays:', holidaysCount, 'Saved:', savedCount);

    const holidaysStat = document.getElementById('stat-holidays');
    const savedStat = document.getElementById('stat-saved');

    if (holidaysStat) {
      holidaysStat.textContent = holidaysCount;
      console.log('✅ Updated holidays stat to:', holidaysCount);
    }
    if (savedStat) {
      savedStat.textContent = savedCount;
    }
  }

  showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loading-overlay');
    const text = document.getElementById('loading-text');
    if (overlay) {
      overlay.classList.remove('hidden');
      if (text) text.textContent = message;
    }
  }

  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  render() {
    this.show();
    this.updateStats();
  }
}

// ==================== HOLIDAYS VIEW ====================
class HolidaysView extends View {
  constructor(stateManager, apiService) {
    super('holidays', stateManager, apiService);
    this.isLoading = false;
    this.loadedKey = null;
    this.init();
  }

  init() {
    // Don't subscribe to state changes - causes infinite loop!
    // Render is called by router when view is opened
  }

  async loadHolidays(countryCode, year) {
    // Create a unique key for this data
    const dataKey = `${countryCode}-${year}`;
    
    // Skip if already loaded or currently loading
    if (this.isLoading || this.loadedKey === dataKey) {
      console.log('⏭️ Holidays already loaded or loading for:', dataKey);
      return;
    }
    
    this.isLoading = true;
    this.showLoading('Loading holidays...');
    
    try {
      const holidays = await this.apiService.getHolidays(countryCode, year);
      this.stateManager.setState({ holidays });
      this.renderHolidays(holidays, countryCode);
      this.loadedKey = dataKey;
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load holidays'
      });
    } finally {
      this.hideLoading();
      this.isLoading = false;
    }
  }

  renderHolidays(holidays, countryCode) {
    const content = document.getElementById('holidays-content');
    if (!content) {
      console.error('❌ holidays-content element not found!');
      return;
    }

    console.log('🎉 Rendering holidays:', holidays?.length, 'holidays for', countryCode);

    const state = this.stateManager.getState();
    const savedPlans = state.savedPlans || [];

    if (!holidays || holidays.length === 0) {
      console.warn('⚠️ No holidays to display');
      content.innerHTML = '<div class="empty-state"><h3>No holidays found</h3></div>';
      return;
    }

    content.innerHTML = holidays.map(holiday => {
      const date = new Date(holiday.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const day = date.getDate();
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const isSaved = savedPlans.some(p => p.type === 'holiday' && p.id === holiday.date);

      return `
        <div class="holiday-card">
          <div class="holiday-card-header">
            <div class="holiday-date-box">
              <span class="day">${day}</span>
              <span class="month">${month}</span>
            </div>
            <button class="holiday-action-btn ${isSaved ? 'saved' : ''}" 
                    data-type="holiday" 
                    data-id="${holiday.date}"
                    data-name="${holiday.name}"
                    data-country="${countryCode}">
              <i class="fa-${isSaved ? 'solid' : 'regular'} fa-heart"></i>
            </button>
          </div>
          <h3>${holiday.localName || holiday.name}</h3>
          <p class="holiday-name">${holiday.name}</p>
          <div class="holiday-card-footer">
            <span class="holiday-day-badge"><i class="fa-regular fa-calendar"></i> ${dayName}</span>
            <span class="holiday-type-badge">${holiday.global ? 'Global' : 'Public'}</span>
          </div>
        </div>
      `;
    }).join('');

    // Add event listeners for save buttons
    content.querySelectorAll('.holiday-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSave(btn);
      });
    });
  }

  toggleSave(button) {
    const type = button.getAttribute('data-type');
    const id = button.getAttribute('data-id');
    const name = button.getAttribute('data-name');
    const country = button.getAttribute('data-country');
    const state = this.stateManager.getState();

    const plan = {
      id: `${type}-${id}`,
      type: type,
      name: name,
      date: id,
      country: country,
      savedAt: new Date().toISOString()
    };

    const isSaved = state.savedPlans.some(p => p.id === plan.id);

    if (isSaved) {
      this.stateManager.deletePlan(plan.id);
      button.classList.remove('saved');
      button.querySelector('i').classList.remove('fa-solid');
      button.querySelector('i').classList.add('fa-regular');
      Swal.fire({
        icon: 'success',
        title: 'Removed',
        text: 'Holiday removed from your plans',
        timer: 1500,
        showConfirmButton: false
      });
    } else {
      this.stateManager.savePlan(plan);
      button.classList.add('saved');
      button.querySelector('i').classList.remove('fa-regular');
      button.querySelector('i').classList.add('fa-solid');
      Swal.fire({
        icon: 'success',
        title: 'Saved!',
        text: 'Holiday added to your plans',
        timer: 1500,
        showConfirmButton: false
      });
    }

    this.updatePlansCount();
  }

  updatePlansCount() {
    const count = this.stateManager.getState().savedPlans.length;
    const badge = document.getElementById('plans-count');
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
    }
  }

  render() {
    this.show();
    const state = this.stateManager.getState();
    
    // Always refresh when view is opened, even if already loaded
    if (state.selectedCountry && state.selectedYear) {
      this.loadHolidays(state.selectedCountry, state.selectedYear);
      this.updateSelection(state.selectedCountry, state.selectedYear);
    } else {
      const content = document.getElementById('holidays-content');
      if (content) {
        content.innerHTML = '<div class="empty-state"><h3>Please select a country and year from Dashboard</h3></div>';
      }
    }
  }

  updateSelection(countryCode, year) {
    const selection = document.getElementById('holidays-selection');
    if (selection) {
      const state = this.stateManager.getState();
      const flagUrl = state.countryInfo?.flags?.png || `https://flagcdn.com/w40/${countryCode?.toLowerCase()}.png`;
      const countryName = state.countryInfo?.name?.common || countryCode;
      
      selection.innerHTML = `
        <div class="current-selection-badge">
          <img src="${flagUrl}" alt="${countryName}" class="selection-flag">
          <span>${countryName}</span>
          <span class="selection-year">${year}</span>
        </div>
      `;
    }
  }

  showLoading(message) {
    const overlay = document.getElementById('loading-overlay');
    const text = document.getElementById('loading-text');
    if (overlay) {
      overlay.classList.remove('hidden');
      if (text) text.textContent = message;
    }
  }

  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
  }
}

// ==================== EVENTS VIEW ====================
class EventsView extends View {
  constructor(stateManager, apiService) {
    super('events', stateManager, apiService);
    this.isLoading = false;
    this.loadedKey = null;
    this.init();
  }

  init() {
    // Don't subscribe to state changes to avoid infinite loops
    // The render() method will load events when the view is opened
  }

  async loadEvents(city, countryCode) {
    // Create a unique key for this data
    const dataKey = `${city}-${countryCode}`;
    
    // Skip if already loaded or currently loading
    if (this.isLoading || this.loadedKey === dataKey) {
      console.log('⏭️ Events already loaded or loading for:', dataKey);
      return;
    }
    
    this.isLoading = true;
    this.showLoading('Loading events...');
    
    try {
      const events = await this.apiService.getEvents(city, countryCode);
      this.stateManager.setState({ events });
      this.renderEvents(events, city);
      this.loadedKey = dataKey;
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load events'
      });
    } finally {
      this.hideLoading();
      this.isLoading = false;
    }
  }

  renderEvents(events, city) {
    const content = document.getElementById('events-content');
    if (!content) {
      console.error('❌ events-content element not found!');
      return;
    }

    console.log('🎭 Rendering events:', events?.length, 'events for', city);

    const state = this.stateManager.getState();
    const savedPlans = state.savedPlans || [];

    if (!events || events.length === 0) {
      content.innerHTML = '<div class="empty-state"><h3>No events found</h3></div>';
      return;
    }

    content.innerHTML = events.map(event => {
      const isSaved = savedPlans.some(p => p.type === 'event' && p.id === event.id);
      const eventDate = new Date(event.date);
      const formattedDate = eventDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });

      return `
        <div class="event-card">
          <div class="event-card-image">
            <img src="${event.image}" alt="${event.title}">
            <span class="event-card-category">${event.category}</span>
            <button class="event-card-save ${isSaved ? 'saved' : ''}" 
                    data-type="event" 
                    data-id="${event.id}"
                    data-name="${event.title}">
              <i class="fa-${isSaved ? 'solid' : 'regular'} fa-heart"></i>
            </button>
          </div>
          <div class="event-card-body">
            <h3>${event.title}</h3>
            <div class="event-card-info">
              <div><i class="fa-regular fa-calendar"></i>${formattedDate} at ${event.time}</div>
              <div><i class="fa-solid fa-location-dot"></i>${event.location}</div>
            </div>
            <div class="event-card-footer">
              <button class="btn-event ${isSaved ? 'saved' : ''}" 
                      data-type="event" 
                      data-id="${event.id}"
                      data-name="${event.title}">
                <i class="fa-${isSaved ? 'solid' : 'regular'} fa-heart"></i> ${isSaved ? 'Saved' : 'Save'}
              </button>
              <a href="#" class="btn-buy-ticket"><i class="fa-solid fa-ticket"></i> Buy Tickets</a>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Add event listeners
    content.querySelectorAll('.btn-event, .event-card-save').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSave(btn);
      });
    });
  }

  toggleSave(button) {
    const type = button.getAttribute('data-type');
    const id = button.getAttribute('data-id');
    const name = button.getAttribute('data-name');
    const state = this.stateManager.getState();

    const plan = {
      id: `${type}-${id}`,
      type: type,
      name: name,
      eventId: id,
      country: state.selectedCountry,
      city: state.selectedCity,
      savedAt: new Date().toISOString()
    };

    const isSaved = state.savedPlans.some(p => p.id === plan.id);
    const content = document.getElementById('events-content');
    
    if (!content) return;

    if (isSaved) {
      this.stateManager.deletePlan(plan.id);
      if (content) {
        content.querySelectorAll(`[data-id="${id}"]`).forEach(btn => {
          btn.classList.remove('saved');
          const icon = btn.querySelector('i');
          if (icon) {
            icon.classList.remove('fa-solid');
            icon.classList.add('fa-regular');
          }
          if (btn.classList.contains('btn-event')) {
            btn.innerHTML = '<i class="fa-regular fa-heart"></i> Save';
          }
        });
      }
    } else {
      this.stateManager.savePlan(plan);
      if (content) {
        content.querySelectorAll(`[data-id="${id}"]`).forEach(btn => {
          btn.classList.add('saved');
          const icon = btn.querySelector('i');
          if (icon) {
            icon.classList.remove('fa-regular');
            icon.classList.add('fa-solid');
          }
          if (btn.classList.contains('btn-event')) {
            btn.innerHTML = '<i class="fa-solid fa-heart"></i> Saved';
          }
        });
      }
    }

    this.updatePlansCount();
  }

  updatePlansCount() {
    const count = this.stateManager.getState().savedPlans.length;
    const badge = document.getElementById('plans-count');
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
    }
  }

  render() {
    // Prevent duplicate renders within 500ms
    const now = Date.now();
    if (this.isRendering || (now - this.lastRenderTime) < 500) {
      console.log('⏭️ Skipping duplicate render for:', this.id);
      return;
    }
    
    this.isRendering = true;
    this.lastRenderTime = now;
    
    this.show();
    const state = this.stateManager.getState();
    
    // Always refresh when view is opened, even if already loaded
    if (state.selectedCity && state.selectedCountry) {
      this.loadEvents(state.selectedCity, state.selectedCountry)
        .finally(() => {
          this.isRendering = false;
        });
      this.updateSelection(state.selectedCountry, state.selectedCity);
    } else {
      const content = document.getElementById('events-content');
      if (content) {
        content.innerHTML = '<div class="empty-state"><h3>Please select a city from Dashboard</h3></div>';
      }
      this.isRendering = false;
    }
  }

  updateSelection(countryCode, city) {
    const selection = document.querySelector('#events-view .view-header-selection');
    if (selection) {
      const state = this.stateManager.getState();
      const flagUrl = state.countryInfo?.flags?.png || `https://flagcdn.com/w40/${countryCode?.toLowerCase()}.png`;
      const countryName = state.countryInfo?.name?.common || countryCode;
      
      selection.innerHTML = `
        <div class="current-selection-badge">
          <img src="${flagUrl}" alt="${countryName}" class="selection-flag">
          <span>${countryName}</span>
          <span class="selection-city">• ${city}</span>
        </div>
      `;
    }
  }

  showLoading(message) {
    const overlay = document.getElementById('loading-overlay');
    const text = document.getElementById('loading-text');
    if (overlay) {
      overlay.classList.remove('hidden');
      if (text) text.textContent = message;
    }
  }

  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
  }
}

// ==================== WEATHER VIEW ====================
class WeatherView extends View {
  constructor(stateManager, apiService) {
    super('weather', stateManager, apiService);
    this.isLoading = false;
    this.loadedKey = null;
    this.init();
  }

  init() {
    // Don't subscribe to state changes - causes infinite loop!
    // Render is called by router when view is opened
  }

  async loadWeather(city, countryCode) {
    // Create a unique key for this data
    const dataKey = `${city}-${countryCode}`;
    
    // Skip if already loaded or currently loading
    if (this.isLoading || this.loadedKey === dataKey) {
      console.log('⏭️ Weather already loaded or loading for:', dataKey);
      return;
    }
    
    this.isLoading = true;
    this.showLoading('Loading weather...');
    
    try {
      const weather = await this.apiService.getWeather(city, countryCode);
      this.stateManager.setState({ weather });
      this.renderWeather(weather, city);
      this.loadedKey = dataKey;
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load weather data'
      });
    } finally {
      this.hideLoading();
      this.isLoading = false;
    }
  }

  renderWeather(weather, city) {
    const content = document.getElementById('weather-content');
    if (!content || !weather) return;

    const current = weather.current;
    const forecast = weather.forecast || [];
    const today = new Date();

    const getWeatherIcon = (condition) => {
      const cond = condition.toLowerCase();
      if (cond.includes('clear') || cond.includes('sunny')) return 'fa-sun';
      if (cond.includes('cloud')) return 'fa-cloud';
      if (cond.includes('rain')) return 'fa-cloud-rain';
      if (cond.includes('storm')) return 'fa-cloud-bolt';
      return 'fa-cloud-sun';
    };

    const weatherClass = current.condition.toLowerCase().includes('clear') || 
                        current.condition.toLowerCase().includes('sunny') ? 'weather-sunny' : 'weather-cloudy';

    content.innerHTML = `
      <div class="weather-hero-card ${weatherClass}">
        <div class="weather-location">
          <i class="fa-solid fa-location-dot"></i>
          <span>${city}</span>
          <span class="weather-time">${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <div class="weather-hero-main">
          <div class="weather-hero-left">
            <div class="weather-hero-icon"><i class="fa-solid ${getWeatherIcon(current.condition)}"></i></div>
            <div class="weather-hero-temp">
              <span class="temp-value">${current.temp}</span>
              <span class="temp-unit">°C</span>
            </div>
          </div>
          <div class="weather-hero-right">
            <div class="weather-condition">${current.condition}</div>
            <div class="weather-feels">Feels like ${current.feelsLike}°C</div>
            <div class="weather-high-low">
              <span class="high"><i class="fa-solid fa-arrow-up"></i> ${forecast[0]?.tempMax || current.temp}°</span>
              <span class="low"><i class="fa-solid fa-arrow-down"></i> ${forecast[0]?.tempMin || current.temp - 5}°</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="weather-details-grid">
        <div class="weather-detail-card">
          <div class="detail-icon humidity"><i class="fa-solid fa-droplet"></i></div>
          <div class="detail-info">
            <span class="detail-label">Humidity</span>
            <span class="detail-value">${current.humidity}%</span>
          </div>
        </div>
        <div class="weather-detail-card">
          <div class="detail-icon wind"><i class="fa-solid fa-wind"></i></div>
          <div class="detail-info">
            <span class="detail-label">Wind</span>
            <span class="detail-value">${current.windSpeed} km/h</span>
          </div>
        </div>
        <div class="weather-detail-card">
          <div class="detail-icon uv"><i class="fa-solid fa-sun"></i></div>
          <div class="detail-info">
            <span class="detail-label">UV Index</span>
            <span class="detail-value">${current.uvIndex}</span>
          </div>
        </div>
        <div class="weather-detail-card">
          <div class="detail-icon precip"><i class="fa-solid fa-cloud-rain"></i></div>
          <div class="detail-info">
            <span class="detail-label">Precipitation</span>
            <span class="detail-value">${current.precipitation}%</span>
          </div>
        </div>
      </div>
      
      <div class="weather-section">
        <h3 class="weather-section-title"><i class="fa-solid fa-calendar-week"></i> 7-Day Forecast</h3>
        <div class="forecast-list">
          ${forecast.map((day, index) => {
            const date = new Date(day.date);
            const isToday = index === 0;
            return `
              <div class="forecast-day ${isToday ? 'today' : ''}">
                <div class="forecast-day-name">
                  <span class="day-label">${isToday ? 'Today' : day.day}</span>
                  <span class="day-date">${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'short' })}</span>
                </div>
                <div class="forecast-icon"><i class="fa-solid ${getWeatherIcon(day.condition)}"></i></div>
                <div class="forecast-temps">
                  <span class="temp-max">${day.tempMax}°</span>
                  <span class="temp-min">${day.tempMin}°</span>
                </div>
                <div class="forecast-precip">
                  ${day.precipitation > 0 ? `<i class="fa-solid fa-droplet"></i><span>${day.precipitation}%</span>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  render() {
    // Prevent duplicate renders within 500ms
    const now = Date.now();
    if (this.isRendering || (now - this.lastRenderTime) < 500) {
      console.log('⏭️ Skipping duplicate render for:', this.id);
      return;
    }
    
    this.isRendering = true;
    this.lastRenderTime = now;
    
    this.show();
    const state = this.stateManager.getState();
    
    // Always refresh when view is opened, even if already loaded
    if (state.selectedCity && state.selectedCountry) {
      this.loadWeather(state.selectedCity, state.selectedCountry)
        .finally(() => {
          this.isRendering = false;
        });
      this.updateSelection(state.selectedCountry, state.selectedCity);
    } else {
      const content = document.getElementById('weather-content');
      if (content) {
        content.innerHTML = '<div class="empty-state"><h3>Please select a city from Dashboard</h3></div>';
      }
      this.isRendering = false;
    }
  }

  updateSelection(countryCode, city) {
    const selection = document.querySelector('#weather-view .view-header-selection');
    if (selection) {
      const state = this.stateManager.getState();
      const flagUrl = state.countryInfo?.flags?.png || `https://flagcdn.com/w40/${countryCode?.toLowerCase()}.png`;
      const countryName = state.countryInfo?.name?.common || countryCode;
      
      selection.innerHTML = `
        <div class="current-selection-badge">
          <img src="${flagUrl}" alt="${countryName}" class="selection-flag">
          <span>${countryName}</span>
          <span class="selection-city">• ${city}</span>
        </div>
      `;
    }
  }

  showLoading(message) {
    const overlay = document.getElementById('loading-overlay');
    const text = document.getElementById('loading-text');
    if (overlay) {
      overlay.classList.remove('hidden');
      if (text) text.textContent = message;
    }
  }

  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
  }
}

// ==================== CURRENCY VIEW ====================
class CurrencyView extends View {
  constructor(stateManager, apiService) {
    super('currency', stateManager, apiService);
    this.rates = {};
    this.init();
  }

  init() {
    this.loadCurrencyRates();
    this.setupEventListeners();
    this.populateCurrencySelects();
  }

  populateCurrencySelects() {
    const currencies = [
      { code: 'USD', name: 'US Dollar' },
      { code: 'EUR', name: 'Euro' },
      { code: 'GBP', name: 'British Pound' },
      { code: 'EGP', name: 'Egyptian Pound' },
      { code: 'AED', name: 'UAE Dirham' },
      { code: 'SAR', name: 'Saudi Riyal' },
      { code: 'JPY', name: 'Japanese Yen' },
      { code: 'CAD', name: 'Canadian Dollar' },
      { code: 'INR', name: 'Indian Rupee' },
      { code: 'AUD', name: 'Australian Dollar' },
      { code: 'CHF', name: 'Swiss Franc' },
      { code: 'CNY', name: 'Chinese Yuan' }
    ];

    const fromSelect = document.getElementById('currency-from');
    const toSelect = document.getElementById('currency-to');

    if (fromSelect) {
      fromSelect.innerHTML = currencies.map(c => 
        `<option value="${c.code}">${c.code} - ${c.name}</option>`
      ).join('');
      fromSelect.value = 'USD';
    }

    if (toSelect) {
      toSelect.innerHTML = currencies.map(c => 
        `<option value="${c.code}">${c.code} - ${c.name}</option>`
      ).join('');
      toSelect.value = 'EGP';
    }
  }

  async loadCurrencyRates(baseCurrency = 'USD') {
    this.showLoading('Loading exchange rates...');
    try {
      this.rates = await this.apiService.getCurrencyRates(baseCurrency);
      this.renderCurrencyRates();
      this.updateConversion();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load currency rates'
      });
    } finally {
      this.hideLoading();
    }
  }

  setupEventListeners() {
    const convertBtn = document.getElementById('convert-btn');
    const swapBtn = document.getElementById('swap-currencies-btn');
    const amountInput = document.getElementById('currency-amount');
    const fromSelect = document.getElementById('currency-from');
    const toSelect = document.getElementById('currency-to');

    if (convertBtn) {
      convertBtn.addEventListener('click', () => this.updateConversion());
    }

    if (swapBtn) {
      swapBtn.addEventListener('click', () => this.swapCurrencies());
    }

    if (amountInput) {
      amountInput.addEventListener('input', () => this.updateConversion());
    }

    if (fromSelect) {
      fromSelect.addEventListener('change', () => {
        this.loadCurrencyRates(fromSelect.value);
      });
    }

    if (toSelect) {
      toSelect.addEventListener('change', () => this.updateConversion());
    }
  }

  swapCurrencies() {
    const fromSelect = document.getElementById('currency-from');
    const toSelect = document.getElementById('currency-to');

    if (fromSelect && toSelect) {
      const temp = fromSelect.value;
      fromSelect.value = toSelect.value;
      toSelect.value = temp;
      this.loadCurrencyRates(fromSelect.value);
    }
  }

  updateConversion() {
    const amountInput = document.getElementById('currency-amount');
    const fromSelect = document.getElementById('currency-from');
    const toSelect = document.getElementById('currency-to');
    const resultDiv = document.getElementById('currency-result');

    if (!amountInput || !fromSelect || !toSelect || !resultDiv) return;

    const amount = parseFloat(amountInput.value) || 0;
    const from = fromSelect.value;
    const to = toSelect.value;

    if (!this.rates[to] || !this.rates[from]) {
      this.loadCurrencyRates(from);
      return;
    }

    // If converting from base currency
    let convertedAmount = amount;
    if (from !== 'USD') {
      // Convert to USD first
      const toUSD = amount / this.rates[from];
      convertedAmount = toUSD * this.rates[to];
    } else {
      convertedAmount = amount * this.rates[to];
    }

    const rate = this.rates[to] / (this.rates[from] || 1);

    resultDiv.innerHTML = `
      <div class="conversion-display">
        <div class="conversion-from">
          <span class="amount">${amount.toFixed(2)}</span>
          <span class="currency-code">${from}</span>
        </div>
        <div class="conversion-equals"><i class="fa-solid fa-equals"></i></div>
        <div class="conversion-to">
          <span class="amount">${convertedAmount.toFixed(2)}</span>
          <span class="currency-code">${to}</span>
        </div>
      </div>
      <div class="exchange-rate-info">
        <p>1 ${from} = ${rate.toFixed(4)} ${to}</p>
        <small>Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</small>
      </div>
    `;
  }

  renderCurrencyRates() {
    const popularCurrencies = document.getElementById('popular-currencies');
    if (!popularCurrencies) return;

    const currencies = [
      { code: 'EUR', name: 'Euro', flag: 'eu' },
      { code: 'GBP', name: 'British Pound', flag: 'gb' },
      { code: 'EGP', name: 'Egyptian Pound', flag: 'eg' },
      { code: 'AED', name: 'UAE Dirham', flag: 'ae' },
      { code: 'SAR', name: 'Saudi Riyal', flag: 'sa' },
      { code: 'JPY', name: 'Japanese Yen', flag: 'jp' },
      { code: 'CAD', name: 'Canadian Dollar', flag: 'ca' },
      { code: 'INR', name: 'Indian Rupee', flag: 'in' }
    ];

    const fromSelect = document.getElementById('currency-from');
    const baseCurrency = fromSelect?.value || 'USD';

    popularCurrencies.innerHTML = currencies.map(currency => {
      const rate = this.rates[currency.code] || 0;
      return `
        <div class="popular-currency-card">
          <img src="https://flagcdn.com/w40/${currency.flag}.png" alt="${currency.code}" class="flag">
          <div class="info">
            <div class="code">${currency.code}</div>
            <div class="name">${currency.name}</div>
          </div>
          <div class="rate">${rate.toFixed(4)}</div>
        </div>
      `;
    }).join('');
  }

  render() {
    this.show();
    if (Object.keys(this.rates).length === 0) {
      this.loadCurrencyRates();
    }
  }

  showLoading(message) {
    const overlay = document.getElementById('loading-overlay');
    const text = document.getElementById('loading-text');
    if (overlay) {
      overlay.classList.remove('hidden');
      if (text) text.textContent = message;
    }
  }

  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
  }
}

// ==================== MY PLANS VIEW ====================
class MyPlansView extends View {
  constructor(stateManager, apiService) {
    super('my-plans', stateManager, apiService);
    this.currentFilter = 'all';
    this.init();
  }

  init() {
    this.setupEventListeners();
    // Don't subscribe to state changes - causes infinite loop!
  }
  
  update() {
    // Update content without changing view visibility
    const state = this.stateManager.getState();
    const plans = state.savedPlans || [];
    
    const filteredPlans = this.currentFilter === 'all' 
      ? plans 
      : plans.filter(p => p.type === this.currentFilter);

    this.renderPlans(filteredPlans);
    this.updateFilterCounts(plans);
  }

  setupEventListeners() {
    const clearAllBtn = document.getElementById('clear-all-plans-btn');
    const startExploringBtn = document.getElementById('start-exploring-btn');
    const filters = document.querySelectorAll('.plan-filter');

    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => this.clearAllPlans());
    }

    if (startExploringBtn) {
      startExploringBtn.addEventListener('click', () => {
        window.app.router.navigate('dashboard');
      });
    }

    filters.forEach(filter => {
      filter.addEventListener('click', () => {
        const filterType = filter.getAttribute('data-filter');
        this.setFilter(filterType);
      });
    });
  }

  setFilter(filterType) {
    this.currentFilter = filterType;
    document.querySelectorAll('.plan-filter').forEach(f => f.classList.remove('active'));
    document.querySelector(`[data-filter="${filterType}"]`)?.classList.add('active');
    this.render();
  }

  clearAllPlans() {
    Swal.fire({
      title: 'Clear All Plans?',
      text: 'This will remove all your saved plans',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, clear all'
    }).then((result) => {
      if (result.isConfirmed) {
        this.stateManager.clearAllPlans();
        Swal.fire({
          icon: 'success',
          title: 'Cleared',
          text: 'All plans have been removed',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  }

  render() {
    this.show();
    const state = this.stateManager.getState();
    const plans = state.savedPlans || [];
    
    const filteredPlans = this.currentFilter === 'all' 
      ? plans 
      : plans.filter(p => p.type === this.currentFilter);

    this.renderPlans(filteredPlans);
    this.updateFilterCounts(plans);
  }

  renderPlans(plans) {
    const content = document.getElementById('plans-content');
    if (!content) return;

    if (plans.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-heart-crack"></i></div>
          <h3>No Saved Plans Yet</h3>
          <p>Start exploring and save holidays, events, or long weekends you like!</p>
          <button class="btn-primary" id="start-exploring-btn">
            <i class="fa-solid fa-compass"></i> Start Exploring
          </button>
        </div>
      `;
      
      document.getElementById('start-exploring-btn')?.addEventListener('click', () => {
        window.app.router.navigate('dashboard');
      });
      return;
    }

    content.innerHTML = plans.map(plan => {
      return this.renderPlanCard(plan);
    }).join('');

    // Add delete listeners
    content.querySelectorAll('.plan-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const planId = btn.getAttribute('data-plan-id');
        this.deletePlan(planId);
      });
    });
  }

  renderPlanCard(plan) {
    const savedDate = new Date(plan.savedAt);
    const iconMap = {
      holiday: 'fa-calendar-check',
      event: 'fa-ticket',
      longweekend: 'fa-umbrella-beach'
    };

    const typeMap = {
      holiday: 'Holiday',
      event: 'Event',
      longweekend: 'Long Weekend'
    };

    if (plan.type === 'holiday') {
      const date = new Date(plan.date);
      return `
        <div class="plan-card">
          <div class="plan-card-header">
            <div class="plan-type-badge holiday">
              <i class="fa-solid ${iconMap[plan.type]}"></i>
              <span>${typeMap[plan.type]}</span>
            </div>
            <button class="plan-delete-btn" data-plan-id="${plan.id}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
          <div class="plan-card-body">
            <h3>${plan.name}</h3>
            <div class="plan-card-info">
              <div><i class="fa-regular fa-calendar"></i> ${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div><i class="fa-solid fa-flag"></i> ${plan.country}</div>
            </div>
          </div>
          <div class="plan-card-footer">
            <small>Saved on ${savedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</small>
          </div>
        </div>
      `;
    }

    if (plan.type === 'event') {
      return `
        <div class="plan-card">
          <div class="plan-card-header">
            <div class="plan-type-badge event">
              <i class="fa-solid ${iconMap[plan.type]}"></i>
              <span>${typeMap[plan.type]}</span>
            </div>
            <button class="plan-delete-btn" data-plan-id="${plan.id}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
          <div class="plan-card-body">
            <h3>${plan.name}</h3>
            <div class="plan-card-info">
              <div><i class="fa-solid fa-location-dot"></i> ${plan.city || 'Unknown'}</div>
              <div><i class="fa-solid fa-flag"></i> ${plan.country}</div>
            </div>
          </div>
          <div class="plan-card-footer">
            <small>Saved on ${savedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</small>
          </div>
        </div>
      `;
    }

    return `
      <div class="plan-card">
        <div class="plan-card-header">
          <div class="plan-type-badge longweekend">
            <i class="fa-solid ${iconMap[plan.type] || 'fa-heart'}"></i>
            <span>${typeMap[plan.type] || 'Plan'}</span>
          </div>
          <button class="plan-delete-btn" data-plan-id="${plan.id}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
        <div class="plan-card-body">
          <h3>${plan.name || 'Saved Plan'}</h3>
          <div class="plan-card-info">
            <div><i class="fa-solid fa-flag"></i> ${plan.country || 'Unknown'}</div>
          </div>
        </div>
        <div class="plan-card-footer">
          <small>Saved on ${savedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</small>
        </div>
      </div>
    `;
  }

  deletePlan(planId) {
    Swal.fire({
      title: 'Delete Plan?',
      text: 'This plan will be removed from your saved plans',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it'
    }).then((result) => {
      if (result.isConfirmed) {
        this.stateManager.deletePlan(planId);
        Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: 'Plan has been removed',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  }

  updateFilterCounts(plans) {
    const counts = {
      all: plans.length,
      holiday: plans.filter(p => p.type === 'holiday').length,
      event: plans.filter(p => p.type === 'event').length,
      longweekend: plans.filter(p => p.type === 'longweekend').length
    };

    Object.keys(counts).forEach(filter => {
      const countElement = document.getElementById(`filter-${filter}-count`);
      if (countElement) {
        countElement.textContent = counts[filter];
      }
    });
  }
}

// ==================== LONG WEEKENDS VIEW ====================
class LongWeekendsView extends View {
  constructor(stateManager, apiService) {
    super('long-weekends', stateManager, apiService);
    this.init();
  }

  init() {
    // Don't subscribe to state changes to avoid infinite loops
    // The render() method will calculate long weekends when the view is opened
  }

  calculateLongWeekends(holidays, year, countryCode) {
    if (!holidays || holidays.length === 0) {
      this.renderEmpty();
      return;
    }

    const longWeekends = [];
    const state = this.stateManager.getState();
    const weekStarts = state.countryInfo?.startOfWeek || 'monday';

    holidays.forEach(holiday => {
      const holidayDate = new Date(holiday.date);
      const dayOfWeek = holidayDate.getDay();
      
      // Check if holiday is near weekend
      let startDate = new Date(holidayDate);
      let endDate = new Date(holidayDate);
      let days = 1;
      let needsBridge = false;

      // Friday holiday -> extends to Sunday
      if (dayOfWeek === 5) {
        endDate.setDate(endDate.getDate() + 2);
        days = 3;
      }
      // Saturday holiday -> extends to Sunday
      else if (dayOfWeek === 6) {
        endDate.setDate(endDate.getDate() + 1);
        days = 2;
      }
      // Sunday holiday -> extends from Saturday
      else if (dayOfWeek === 0) {
        startDate.setDate(startDate.getDate() - 1);
        days = 2;
      }
      // Monday holiday -> extends from Friday
      else if (dayOfWeek === 1) {
        startDate.setDate(startDate.getDate() - 3);
        days = 4;
        needsBridge = true;
      }
      // Thursday holiday -> extends to Sunday
      else if (dayOfWeek === 4) {
        endDate.setDate(endDate.getDate() + 3);
        days = 4;
        needsBridge = true;
      }

      if (days >= 3) {
        longWeekends.push({
          id: `lw-${holiday.date}`,
          name: `Long Weekend - ${holiday.name}`,
          startDate: startDate,
          endDate: endDate,
          days: days,
          needsBridge: needsBridge,
          holiday: holiday
        });
      }
    });

    this.renderLongWeekends(longWeekends, countryCode);
  }

  renderLongWeekends(longWeekends, countryCode) {
    const content = document.getElementById('lw-content');
    if (!content) return;

    const state = this.stateManager.getState();
    const savedPlans = state.savedPlans || [];

    if (longWeekends.length === 0) {
      content.innerHTML = '<div class="empty-state"><h3>No long weekends found</h3></div>';
      return;
    }

    content.innerHTML = longWeekends.map(lw => {
      const isSaved = savedPlans.some(p => p.type === 'longweekend' && p.id === lw.id);
      const startStr = lw.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = lw.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const days = [];
      const current = new Date(lw.startDate);
      while (current <= lw.endDate) {
        const dayOfWeek = current.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        days.push({
          name: current.toLocaleDateString('en-US', { weekday: 'short' }),
          num: current.getDate(),
          isWeekend: isWeekend,
          isHoliday: current.toDateString() === new Date(lw.holiday.date).toDateString()
        });
        current.setDate(current.getDate() + 1);
      }

      return `
        <div class="lw-card">
          <div class="lw-card-header">
            <span class="lw-badge"><i class="fa-solid fa-calendar-days"></i> ${lw.days} Days</span>
            <button class="holiday-action-btn ${isSaved ? 'saved' : ''}" 
                    data-type="longweekend" 
                    data-id="${lw.id}"
                    data-name="${lw.name}">
              <i class="fa-${isSaved ? 'solid' : 'regular'} fa-heart"></i>
            </button>
          </div>
          <h3>${lw.holiday.name}</h3>
          <div class="lw-dates"><i class="fa-regular fa-calendar"></i> ${startStr} - ${endStr}</div>
          <div class="lw-info-box ${lw.needsBridge ? 'warning' : 'success'}">
            <i class="fa-solid ${lw.needsBridge ? 'fa-info-circle' : 'fa-check-circle'}"></i> 
            ${lw.needsBridge ? 'Requires taking a bridge day off' : 'No extra days off needed!'}
          </div>
          <div class="lw-days-visual">
            ${days.map(day => `
              <div class="lw-day ${day.isWeekend ? 'weekend' : ''} ${day.isHoliday ? 'holiday' : ''}">
                <span class="name">${day.name}</span>
                <span class="num">${day.num}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Add event listeners
    content.querySelectorAll('.holiday-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSave(btn);
      });
    });
  }

  toggleSave(button) {
    const type = button.getAttribute('data-type');
    const id = button.getAttribute('data-id');
    const name = button.getAttribute('data-name');
    const state = this.stateManager.getState();

    const plan = {
      id: id,
      type: type,
      name: name,
      country: state.selectedCountry,
      year: state.selectedYear,
      savedAt: new Date().toISOString()
    };

    const isSaved = state.savedPlans.some(p => p.id === plan.id);

    if (isSaved) {
      this.stateManager.deletePlan(plan.id);
      button.classList.remove('saved');
      button.querySelector('i').classList.remove('fa-solid');
      button.querySelector('i').classList.add('fa-regular');
    } else {
      this.stateManager.savePlan(plan);
      button.classList.add('saved');
      button.querySelector('i').classList.remove('fa-regular');
      button.querySelector('i').classList.add('fa-solid');
    }

    this.updatePlansCount();
  }

  updatePlansCount() {
    const count = this.stateManager.getState().savedPlans.length;
    const badge = document.getElementById('plans-count');
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
    }
  }

  render() {
    this.show();
    const state = this.stateManager.getState();
    
    if (state.selectedCountry && state.selectedYear && state.holidays) {
      this.calculateLongWeekends(state.holidays, state.selectedYear, state.selectedCountry);
      this.updateSelection(state.selectedCountry, state.selectedYear);
    } else {
      this.renderEmpty();
    }
  }

  renderEmpty() {
    const content = document.getElementById('lw-content');
    if (content) {
      content.innerHTML = `
        <div class="empty-state">
          <h3>No Country Selected</h3>
          <p>Select a country from the dashboard to discover long weekend opportunities</p>
          <button class="btn-primary" onclick="window.app.router.navigate('dashboard')">
            <i class="fa-solid fa-compass"></i> Go to Dashboard
          </button>
        </div>
      `;
    }
  }

  updateSelection(countryCode, year) {
    const selection = document.querySelector('#long-weekends-view .view-header-selection');
    if (selection) {
      const state = this.stateManager.getState();
      const flagUrl = state.countryInfo?.flags?.png || `https://flagcdn.com/w40/${countryCode?.toLowerCase()}.png`;
      const countryName = state.countryInfo?.name?.common || countryCode;
      
      selection.innerHTML = `
        <div class="current-selection-badge">
          <img src="${flagUrl}" alt="${countryName}" class="selection-flag">
          <span>${countryName}</span>
          <span class="selection-year">${year}</span>
        </div>
      `;
    }
  }
}

// ==================== SUN TIMES VIEW ====================
class SunTimesView extends View {
  constructor(stateManager, apiService) {
    super('sun-times', stateManager, apiService);
    this.init();
  }

  init() {
    // Don't subscribe to state changes - causes infinite loop!
    // Render is called by router when view is opened
  }

  async loadSunTimes(city, countryCode) {
    // Calculate sun times based on city coordinates
    // For demo, we'll use mock data
    const sunTimes = this.calculateSunTimes(city);
    this.renderSunTimes(sunTimes, city);
  }

  calculateSunTimes(city) {
    // Mock sun times calculation
    // In production, use actual API with coordinates
    const now = new Date();
    const sunrise = new Date(now);
    sunrise.setHours(6, 42, 0);
    
    const sunset = new Date(now);
    sunset.setHours(17, 24, 0);
    
    const dawn = new Date(now);
    dawn.setHours(6, 15, 0);
    
    const dusk = new Date(now);
    dusk.setHours(17, 51, 0);
    
    const noon = new Date(now);
    noon.setHours(12, 3, 0);

    const dayLength = (sunset - sunrise) / (1000 * 60); // minutes
    const dayLengthHours = Math.floor(dayLength / 60);
    const dayLengthMinutes = Math.floor(dayLength % 60);
    const dayPercentage = (dayLength / (24 * 60)) * 100;

    return {
      dawn: this.formatTime(dawn),
      sunrise: this.formatTime(sunrise),
      noon: this.formatTime(noon),
      sunset: this.formatTime(sunset),
      dusk: this.formatTime(dusk),
      dayLength: `${dayLengthHours}h ${dayLengthMinutes}m`,
      dayPercentage: dayPercentage.toFixed(1),
      nightLength: `${24 - dayLengthHours}h ${60 - dayLengthMinutes}m`
    };
  }

  formatTime(date) {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

  renderSunTimes(sunTimes, city) {
    const content = document.getElementById('sun-times-content');
    if (!content) return;

    const today = new Date();

    content.innerHTML = `
      <div class="sun-main-card">
        <div class="sun-main-header">
          <div class="sun-location">
            <h2><i class="fa-solid fa-location-dot"></i> ${city}</h2>
            <p>Sun times for your selected location</p>
          </div>
          <div class="sun-date-display">
            <div class="date">${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            <div class="day">${today.toLocaleDateString('en-US', { weekday: 'long' })}</div>
          </div>
        </div>
        
        <div class="sun-times-grid">
          <div class="sun-time-card dawn">
            <div class="icon"><i class="fa-solid fa-moon"></i></div>
            <div class="label">Dawn</div>
            <div class="time">${sunTimes.dawn}</div>
            <div class="sub-label">Civil Twilight</div>
          </div>
          <div class="sun-time-card sunrise">
            <div class="icon"><i class="fa-solid fa-sun"></i></div>
            <div class="label">Sunrise</div>
            <div class="time">${sunTimes.sunrise}</div>
            <div class="sub-label">Golden Hour Start</div>
          </div>
          <div class="sun-time-card noon">
            <div class="icon"><i class="fa-solid fa-sun"></i></div>
            <div class="label">Solar Noon</div>
            <div class="time">${sunTimes.noon}</div>
            <div class="sub-label">Sun at Highest</div>
          </div>
          <div class="sun-time-card sunset">
            <div class="icon"><i class="fa-solid fa-sun"></i></div>
            <div class="label">Sunset</div>
            <div class="time">${sunTimes.sunset}</div>
            <div class="sub-label">Golden Hour End</div>
          </div>
          <div class="sun-time-card dusk">
            <div class="icon"><i class="fa-solid fa-moon"></i></div>
            <div class="label">Dusk</div>
            <div class="time">${sunTimes.dusk}</div>
            <div class="sub-label">Civil Twilight</div>
          </div>
          <div class="sun-time-card daylight">
            <div class="icon"><i class="fa-solid fa-hourglass-half"></i></div>
            <div class="label">Day Length</div>
            <div class="time">${sunTimes.dayLength}</div>
            <div class="sub-label">Total Daylight</div>
          </div>
        </div>
      </div>
      
      <div class="day-length-card">
        <h3><i class="fa-solid fa-chart-pie"></i> Daylight Distribution</h3>
        <div class="day-progress">
          <div class="day-progress-bar">
            <div class="day-progress-fill" style="width: ${sunTimes.dayPercentage}%"></div>
          </div>
        </div>
        <div class="day-length-stats">
          <div class="day-stat">
            <div class="value">${sunTimes.dayLength}</div>
            <div class="label">Daylight</div>
          </div>
          <div class="day-stat">
            <div class="value">${sunTimes.dayPercentage}%</div>
            <div class="label">of 24 Hours</div>
          </div>
          <div class="day-stat">
            <div class="value">${sunTimes.nightLength}</div>
            <div class="label">Darkness</div>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    this.show();
    const state = this.stateManager.getState();
    
    if (state.selectedCity) {
      this.loadSunTimes(state.selectedCity, state.selectedCountry);
      this.updateSelection(state.selectedCountry, state.selectedCity);
    } else {
      this.renderEmpty();
    }
  }

  renderEmpty() {
    const content = document.getElementById('sun-times-content');
    if (content) {
      content.innerHTML = `
        <div class="empty-state">
          <h3>No City Selected</h3>
          <p>Select a country and city from the dashboard to see sunrise and sunset times</p>
          <button class="btn-primary" onclick="window.app.router.navigate('dashboard')">
            <i class="fa-solid fa-compass"></i> Go to Dashboard
          </button>
        </div>
      `;
    }
  }

  updateSelection(countryCode, city) {
    const selection = document.querySelector('#sun-times-view .view-header-selection');
    if (selection) {
      const state = this.stateManager.getState();
      const flagUrl = state.countryInfo?.flags?.png || `https://flagcdn.com/w40/${countryCode?.toLowerCase()}.png`;
      const countryName = state.countryInfo?.name?.common || countryCode;
      
      selection.innerHTML = `
        <div class="current-selection-badge">
          <img src="${flagUrl}" alt="${countryName}" class="selection-flag">
          <span>${countryName}</span>
          <span class="selection-city">• ${city}</span>
        </div>
      `;
    }
  }
}

// ==================== APPLICATION CLASS ====================
class WanderlustApp {
  constructor() {
    this.apiService = new APIService(API_CONFIG.baseURL);
    this.stateManager = new StateManager();
    this.router = new Router();
    this.views = {};
    this.init();
  }

  init() {
    this.setupViews();
    this.setupRouter();
    // بعد تسجيل الـ routes نستدعي الراوتر لأول مرة
    this.router.handleRoute();
    this.setupNavigation();
    this.setupDateTime();
    this.setupMobileMenu();
  }

  setupViews() {
    this.views.dashboard = new DashboardView(this.stateManager, this.apiService);
    this.views.holidays = new HolidaysView(this.stateManager, this.apiService);
    this.views.events = new EventsView(this.stateManager, this.apiService);
    this.views.weather = new WeatherView(this.stateManager, this.apiService);
    this.views.longWeekends = new LongWeekendsView(this.stateManager, this.apiService);
    this.views.currency = new CurrencyView(this.stateManager, this.apiService);
    this.views.sunTimes = new SunTimesView(this.stateManager, this.apiService);
    this.views.myPlans = new MyPlansView(this.stateManager, this.apiService);

    // Subscribe to state changes to update plans count
    this.stateManager.subscribe((state) => {
      this.updatePlansCount(state.savedPlans?.length || 0);
    });
  }

  setupRouter() {
    this.router.register('dashboard', () => {
      this.views.dashboard?.render();
      this.updatePageTitle('Dashboard');
      this.updateActiveNavItem('dashboard');
    });

    this.router.register('holidays', () => {
      this.views.holidays?.render();
      this.updatePageTitle('Holidays');
      this.updateActiveNavItem('holidays');
    });

    this.router.register('events', () => {
      this.views.events?.render();
      this.updatePageTitle('Events');
      this.updateActiveNavItem('events');
    });

    this.router.register('weather', () => {
      this.views.weather?.render();
      this.updatePageTitle('Weather');
      this.updateActiveNavItem('weather');
    });

    this.router.register('long-weekends', () => {
      this.views.longWeekends?.render();
      this.updatePageTitle('Long Weekends');
      this.updateActiveNavItem('long-weekends');
    });

    this.router.register('currency', () => {
      this.views.currency?.render();
      this.updatePageTitle('Currency Converter');
      this.updateActiveNavItem('currency');
    });

    this.router.register('sun-times', () => {
      this.views.sunTimes?.render();
      this.updatePageTitle('Sun Times');
      this.updateActiveNavItem('sun-times');
    });

    this.router.register('my-plans', () => {
      this.views.myPlans?.render();
      this.updatePageTitle('My Plans');
      this.updateActiveNavItem('my-plans');
    });
  }

  updatePlansCount(count) {
    const badge = document.getElementById('plans-count');
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
    }
  }

  setupNavigation() {
    // Prevent duplicate event listeners
    if (this.navigationSetup) {
      console.warn('⚠️ Navigation already setup, skipping...');
      return;
    }
    this.navigationSetup = true;
    
    console.log('🔗 Setting up navigation...');
    
    document.querySelectorAll('[data-view]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.getAttribute('data-view');
        console.log('📍 User clicked:', view);
        this.router.navigate(view);
        this.updateActiveNavItem(view);
      });
    });
    
    console.log('✅ Navigation setup complete');
  }

  updateActiveNavItem(activeView) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-view') === activeView) {
        item.classList.add('active');
      }
    });
  }

  updatePageTitle(title) {
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = title;
  }

  setupDateTime() {
    const updateDateTime = () => {
      const now = new Date();
      const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      const dateTimeStr = now.toLocaleDateString('en-US', options);
      const dateTimeElement = document.getElementById('current-datetime');
      if (dateTimeElement) {
        dateTimeElement.textContent = dateTimeStr;
      }
    };

    updateDateTime();
    setInterval(updateDateTime, 60000);
  }

  setupMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        sidebar?.classList.toggle('mobile-open');
        overlay?.classList.toggle('hidden');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar?.classList.remove('mobile-open');
        overlay.classList.add('hidden');
      });
    }
  }
}

// ==================== INITIALIZE APPLICATION ====================
document.addEventListener('DOMContentLoaded', () => {
  window.app = new WanderlustApp();
});

