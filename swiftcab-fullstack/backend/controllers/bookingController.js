const Booking = require('../models/Booking');
const mongoose = require('mongoose');

// In-memory storage fallback when MongoDB is not available
const mockBookings = [];
let bookingCounter = 1;

// Helper function to check if MongoDB is connected
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Helper function for calculating fare (similar to the original JS logic)
const calculateFare = (cabType, distance) => {
  const baseFares = {
    'mini': 5,
    'sedan': 8,
    'suv': 12
  };
  
  const ratePerMile = {
    'mini': 1.5,
    'sedan': 2,
    'suv': 2.5
  };
  
  const baseFare = baseFares[cabType];
  const distanceCharge = distance * ratePerMile[cabType];
  return baseFare + distanceCharge;
};

// Helper function to generate booking ID
const generateBookingId = () => {
  return 'SC' + Math.floor(10000 + Math.random() * 90000);
};

// Helper function to create booking object
const createBookingObject = (data) => {
  return {
    _id: `mock-${bookingCounter++}`,
    bookingId: generateBookingId(),
    pickupLocation: data.pickupLocation,
    dropLocation: data.dropLocation,
    date: data.date,
    time: data.time,
    cabType: data.cabType,
    fare: data.fare,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    const { pickupLocation, dropLocation, date, time, cabType } = req.body;
    
    // Validate required fields
    if (!pickupLocation || !dropLocation || !date || !time || !cabType) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    // Generate a random distance (in a real app, this would be calculated using a maps API)
    const distance = Math.floor(Math.random() * 20) + 5; // 5-25 miles
    
    // Calculate fare based on cab type and distance
    const fare = calculateFare(cabType, distance);
    
    if (isMongoConnected()) {
      // Use MongoDB
      const booking = new Booking({
        pickupLocation,
        dropLocation,
        date,
        time,
        cabType,
        fare
      });
      
      await booking.save();
      
      res.status(201).json({
        success: true,
        data: booking
      });
    } else {
      // Use in-memory fallback
      const booking = createBookingObject({
        pickupLocation,
        dropLocation,
        date,
        time,
        cabType,
        fare
      });
      
      mockBookings.unshift(booking);
      
      res.status(201).json({
        success: true,
        data: booking
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create booking'
    });
  }
};

// Get all bookings
exports.getBookings = async (req, res) => {
  try {
    if (isMongoConnected()) {
      const bookings = await Booking.find().sort({ createdAt: -1 });
      
      res.status(200).json({
        success: true,
        count: bookings.length,
        data: bookings
      });
    } else {
      // Return mock bookings
      res.status(200).json({
        success: true,
        count: mockBookings.length,
        data: mockBookings
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch bookings'
    });
  }
};

// Get a single booking
exports.getBooking = async (req, res) => {
  try {
    if (isMongoConnected()) {
      const booking = await Booking.findById(req.params.id);
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: booking
      });
    } else {
      // Search in mock bookings
      const booking = mockBookings.find(b => b._id === req.params.id);
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: booking
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch booking'
    });
  }
};

// Cancel a booking
exports.cancelBooking = async (req, res) => {
  try {
    if (isMongoConnected()) {
      const booking = await Booking.findById(req.params.id);
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }
      
      // Only cancel if the booking is not already completed
      if (booking.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel a completed ride'
        });
      }
      
      booking.status = 'cancelled';
      await booking.save();
      
      res.status(200).json({
        success: true,
        data: booking
      });
    } else {
      // Search in mock bookings
      const booking = mockBookings.find(b => b._id === req.params.id);
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }
      
      if (booking.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel a completed ride'
        });
      }
      
      booking.status = 'cancelled';
      
      res.status(200).json({
        success: true,
        data: booking
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel booking'
    });
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'on the way', 'arrived', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    if (isMongoConnected()) {
      const booking = await Booking.findById(req.params.id);
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }
      
      booking.status = status;
      await booking.save();
      
      res.status(200).json({
        success: true,
        data: booking
      });
    } else {
      // Update in mock bookings
      const booking = mockBookings.find(b => b._id === req.params.id);
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }
      
      booking.status = status;
      booking.updatedAt = new Date();
      
      res.status(200).json({
        success: true,
        data: booking
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update booking status'
    });
  }
}; 