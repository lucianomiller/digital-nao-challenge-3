// app.js

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// Conexión a MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/tutorial', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'Error de conexión a MongoDB:'));
db.once('connected', () => {
  console.log('Conectado a MongoDB');
});

// Definir el esquema y el modelo
const restaurantSchema = new mongoose.Schema({
  name: String,
  contact: {
    phone: String,
    email: String,
    location: [Number],
  },
  stars: Number,
  categories: [String],
  comments: [
    {
      user: String,
      text: String,
      date: Date,
    },
  ],
  rates: [
    {
      date: Date,
      stars: Number,
    },
  ],
});

restaurantSchema.index({
  name: 1,
  'contact.phone': 1,
  'contact.email': 1,
  'contact.location': '2dsphere',
  stars: -1,
  categories: 1,
  'comments.user': 1,
  'comments.text': 1,
  'comments.date': -1,
  'rates.date': -1,
  'rates.stars': -1,
});

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

// Rutas
// CRUD para restaurantes
app.get('/restaurants', async (req, res) => {
  try {
    const { name, phone, email, minStars, category } = req.query;
    const { longitude, latitude } = req.query; // Assuming user's longitude and latitude are provided in the query parameters
    const filter = {};
    if (name) filter.name = { $regex: new RegExp(name, 'i') };
    if (phone) filter['contact.phone'] = { $regex: new RegExp(phone, 'i') };
    if (email) filter['contact.email'] = { $regex: new RegExp(email, 'i') };
    if (minStars) filter.stars = { $gte: parseInt(minStars, 10) };
    if (category) filter.categories = { $regex: new RegExp(category, 'i') };
    if (longitude && latitude) {
      filter['contact.location'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: 10000, // Specify the maximum distance in meters
        },
      };
    }
    const restaurants = await Restaurant.find(filter);
    res.json(restaurants);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/restaurants', async (req, res) => {
  try {
    const newRestaurant = await Restaurant.create(req.body);
    res.json(newRestaurant);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener un restaurante por ID
app.get('/restaurants/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }
    res.json(restaurant);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Crear un nuevo restaurante
app.post('/restaurants', async (req, res) => {
  const restaurantData = req.body;
  try {
    const newRestaurant = await Restaurant.create(restaurantData);
    res.status(201).json(newRestaurant);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un restaurante
app.put('/restaurants/:id', async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  try {
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(id, updatedData, { new: true });
    if (!updatedRestaurant) {
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }
    res.json(updatedRestaurant);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un restaurante
app.delete('/restaurants/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedRestaurant = await Restaurant.findByIdAndDelete(id);
    if (!deletedRestaurant) {
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }
    res.json(deletedRestaurant);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Agregar comentario a un restaurante
app.post('/restaurants/:id/comments', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }
    const comment = {
      date: new Date(),
      ...req.body
    };
    restaurant.comments.push(comment);
    await restaurant.save();
    res.json(restaurant);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Calificar a un restaurante
app.post('/restaurants/:id/rates', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }
    const rate = {
      date: new Date(),
      stars: req.body.stars,
    };
    restaurant.rates.push(rate);
    await restaurant.save();
    res.json(restaurant);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
