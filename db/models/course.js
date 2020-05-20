const Sequelize = require('sequelize');

module.exports = (sequelize) => {
    class Course extends Sequelize.Model {}
    Course.init({
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement:true
      },
      title: {
        type: Sequelize.STRING
      },
      description: {
        type: Sequelize.TEXT
      },
      estimatedTime: {
        type: Sequelize.STRING,
        allowNull: true,
      }, 
      materialsNeeded: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      userId:{
        type:Sequelize.INTEGER,
        foreignKey: true
      }
    }, { sequelize });
  
    Course.associate = (models) => {
      Course.belongsTo(models.User, { 
        foreignKey: {
          fieldName: 'userId',
          allowNull:false,
        }
      });
    };
  
    return Course;
  };
  