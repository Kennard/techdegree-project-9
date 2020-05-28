'use strict';

const express = require('express');
const router = express.Router();
const { models } = require('./db');
const { check, validationResult } = require('express-validator');
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');

function asyncHandler(cb){
    return async (req, res, next)=>{
      try {
        await cb(req, res, next);
      } catch(err){
        next(err);
      }
    };
  }

  const authenticateUser = async(req, res, next) => {
    let message = null;
  
    // Parse the user's credentials from the 'Postman' Authorization header.
    const credentials = auth(req);
    // If credentials are available get the user from the User db by their emailAddress
    if(credentials){
      const users = await models.User.findAll();
      const user = users.find(u => u.emailAddress === credentials.name);
    // If a user exist compare the bcryptjs npm package to compare the user's password
    // (from the 'Postman' Authorization header) to the user's password
      if(user){
        const authenticated = bcryptjs
          .compareSync(credentials.pass, user.password);
        // If the passwords match...
          if (authenticated){  
            console.log(`Authentication successful for emailAdress: ${user.emailAddress}`);
            // Store the retrieved user object on the request object so any middleware functions
            // that follow this middleware function will have access to the user's information.
            req.currentUser = user;
          } else {
            message= `Authentication failure for Postman username: ${user.emailAddress}`;
          }
      } else {
          message = `User not found for username: ${credentials.name}`;
      }
    } else {
        message = 'Auth header not found';
    }
    // If user authentication failed...
    if(message) {
      console.warn(message);
    // Return a response with a 401 Unauthorized HTTP status code.
      res.status(401).json({ message: 'Access Denied' });
    } else {
      // Or if user authentication succeeded...
      // Call the next() method.
     next();
    }
  };


// *** User Routes ***

// Send a GET request for the currently authenticated user.
  router.get('/users', authenticateUser, asyncHandler(async(req, res) => {  
    const user = req.currentUser;  
    res.json({
        firstName: user.firstName,
        lastName: user.lastName,
        emailAddress: user.emailAddress,
     });
  }));


// Send a POST request to creates a new user and validate each field.
 router.post('/users', [
  check('firstName')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "firstName"'),
  check('lastName')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "lastName"'),
  check('emailAddress')
    .exists()
    .withMessage('Please provide a value for "emailAddress"')
    // Validate that the provided email address value is in fact a
    // valid email address using isEmail.
    .isEmail()
    .withMessage('Email must be a valid "email address" ')
    // Validate email address isn't already associated 
    // with an existing user record.
    .custom(async(value, { req }) => {  
      const email = await models.User.findOne({ 
        where: {emailAddress: value} 
      }); 
        if(value === email.emailAddress){   
          throw new Error('Email already exist!');         
        }else{
          return value;
        }
    }),
  check('password')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "password"') 
  ], asyncHandler(async(req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Use the Array `map()` method to get a list of error messages.
      const errorMessages = errors.array().map(error => error.msg);
      // Returns validation errors to the client.
      return res.status(400).json({ errors: errorMessages });
    }

    
  // Hash the new user's password. 
  const password = bcryptjs.hashSync(req.body.password);

  const users = await models.User.create({    
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      emailAddress: req.body.emailAddress,
      password
      });
  
   // Set the status to 201 Created and end the response.
   res.status(201).end(); 
    
  }));


//*** Course Routes ***

// Send a GET request that returns a list of course.
router.get('/courses', asyncHandler(async(req, res) => {  
   const courses = await models.Course.findAll({
    attributes: { exclude: ['createdAt', 'updatedAt'] },
    include: [
      {
        model: models.User,
        as: 'owner',
        attributes: { exclude: ['createdAt', 'updatedAt', 'password'] },
      }
    ],
  });
  if(courses){
    res.status(200).json(courses);
  }else{
    res.status(404).json({message: "Does not exist" }); 

  }
}));

// Send a GET request that returns a course.
router.get('/courses/:id', asyncHandler(async(req, res) => {  
  const course = await models.Course.findByPk(req.params.id, {
    attributes: { exclude: ['createdAt', 'updatedAt'] },
    include: [
        {
          model: models.User,
          as: 'owner',
          attributes: { exclude: ['createdAt', 'updatedAt', 'password'] },
        }
      ],
  });
  if(course){
      res.status(200).json({course});
  } else{
    res.status(404).json({message: "Course does not exist" }); 
  }
}));



// Send a POST request to create a new course.
router.post('/courses', [
  check('title')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "title"'),
  check('description')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "description"')
], authenticateUser, asyncHandler(async(req, res) => {  
  
  const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Use the Array `map()` method to get a list of error messages.
      const errorMessages = errors.array().map(error => error.msg);
      // Returns validation errors to the client.
      return res.status(400).json({ errors: errorMessages });
    }

  const course = await models.Course.create({    
      title: req.body.title,
      description: req.body.description,
      estimatedTime: req.body.estimatedTime,
      materialsNeeded: req.body.materialsNeeded,
      userId: req.body.userId
    });
  
    // Set the status to 201 Created and end the response.
   res.status(201).end(); 
}));

// Send a PUT request to Update a course and return no content.
router.put('/courses/:id',[
  check('title')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "title"'),
  check('description')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "description"')
], authenticateUser, asyncHandler(async(req, res) => { 

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Use the Array `map()` method to get a list of error messages.
    const errorMessages = errors.array().map(error => error.msg);
    // Returns validation errors to the client.
    return res.status(400).json({ errors: errorMessages });
  }
  const course = await models.Course.findByPk(req.params.id);
  const user = req.currentUser;

  if(course.userId === user.id) {
    await models.Course.update({    
        title: req.body.title,
        description: req.body.description,
        estimatedTime: req.body.estimatedTime,
        materialsNeeded: req.body.materialsNeeded
      }, { where: { id: req.params.id} 
    });
    res.status(204).end();
  } else {
    res.status(403).json("User does not own course"); 
  }
   
}));

// Send a DELETE request to delete a course and return no content.
router.delete('/courses/:id', authenticateUser, asyncHandler(async(req, res) => { 
  
  const course = await models.Course.findByPk(req.params.id);
  const user = req.currentUser;
  
  if(course.userId === user.id) {
      await models.Course.destroy({ 
        where: { id: req.params.id} 
      });
    res.status(204).end(); 
  }else{
    res.status(403).json("User does not own course"); 
  }

}));

module.exports = router; 