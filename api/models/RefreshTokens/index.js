const RefreshTokenModel = require('./schema');

RefreshTokenModel.add = params => new Promise((resolve, reject) => {
    const refreshToken = new RefreshTokenModel({...params})
    refreshToken.save()
    .then(result => {
        //console.info(result);
        resolve(result);
    })
    .catch(err => {
        console.warn(err.message);
        reject(error);
    })
})

RefreshTokenModel.updateOne = (_id, update) => new Promise((resolve, reject) =>  {
    RefreshTokenModel.findOneAndUpdate({_id}, {...update}, {new: true}, (error, document) => {
        if (error) return reject(error);
        else return resolve(document);
    })
})

RefreshTokenModel.getById = token => new Promise((resolve, reject) =>{
    RefreshTokenModel.findOne({_id: token}, (error, document) => {
        if (error) reject(error);
        else resolve(document);
    })
});

module.exports = RefreshTokenModel;