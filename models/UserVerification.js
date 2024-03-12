const mongoose=require('mongoose');
const UserVerificationSchema=mongoose.Schema({
    userId:{
        type:String,
    },
    uniqueString:{
        type:String,
    },
    createdAt:{
        type:Date,
    },
    expiredAt:{
        type:Date,
    }
});
const UserVerification=mongoose.model('UserVerification',UserVerificationSchema);
module.exports=UserVerification;