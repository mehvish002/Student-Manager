require('dotenv').config();
const express=require('express')
const mongoose=require('mongoose');
const User=require('./models/User');
const UserVerification=require('./models/UserVerification');
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');
const nodemailer=require('nodemailer');
const {v4:uuidv4}=require('uuid');
const cors = require('cors'); 
//path for static verified page
const path = require('path')

const secret=process.env.SECRET;
const app=express();
app.use(express.static(path.join(__dirname, 'views')));
mongoose.connect('mongodb://127.0.0.1:27017/otpVerification');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

//nodemailer
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS
    }
})
transporter.verify((error,success)=>{
    if(error){
        console.log(error);
    }
    else{
        console.log("Ready for messages");
        console.log(success);
    }
})
app.get('/register',(req,res)=>{
    res.sendFile(path.join(__dirname, "views/register.html"));
})
app.get('/login',(req,res)=>{
    res.sendFile(path.join(__dirname, "views/login.html"));
})
//signup
app.post('/register',async (req,res)=>{
    try {
    // console.log('Request Body:', req.body);
    const user = req.body;
    const existingUser = await User.findOne({ username: user.username });
    if (existingUser) {
        return res.send("Username already exists");
    }
    if (!user.password || !user.username) {
        res.send("Username and password are required"); 
        return;     
    }
    if (user.password.length < 4) {
        res.send("Password length must be >= 4");
        return; 
    }
    const newUser = new User(user);
    const saltRounds = 10;

    const hashedPwd = await bcrypt.hash(newUser.password, saltRounds);
    newUser.password = hashedPwd; 
    newUser.verified=false;

    try {
        const result=await newUser.save();
        //send verification mail
        sendVerificationEmail(result,res);
    } catch(err) {
        res.send("Couldn't register account");
    }
}catch (error) {
    console.error('Error parsing JSON:', error);
    res.status(400).send('Invalid JSON in the request body');
}

    
})
//send verification mail
const sendVerificationEmail = async ({ _id, email }, res) => {
    //url to be used in the email
    const currentUrl = "http://localhost:3000/";
    const uniqueString = uuidv4()+_id;
    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "verify Your Email",
        html: `<p>Verify your email address to complete the signup and login into your account.</p><p>
        This link <b>expires in 2 min</b>.</p><p>Click <a href=${currentUrl + "verify/" + _id + "/" + uniqueString}>here</a> to proceed.</p>`,
    };
    // hash the uniqueString
    const saltRounds = 10;
    bcrypt
    .hash(uniqueString,saltRounds)
    .then((hashedUniqueString)=>{
        const newVerification = new UserVerification({
            userId: _id,
            uniqueString: hashedUniqueString,
            createdAt: Date.now(),
            expiresAt: Date.now() + 120000,
        })
        newVerification
        .save()
        .then(()=>{
            transporter
            .sendMail(mailOptions)
            .then(()=>{
                //email sent and verification record saved
                // res.send("Registration successful");
                res.send("please verify your email")

            })
            .catch((error)=>{
                console.log(error)
                res.json({
                    status:"FAILED",
                    message:"verification email failed"
                })
            })
        })
        .catch((error)=>{
            console.log(error)
            res.json({
                status:"FAILED",
                message:"Couldn't save verification email data!"
            })
        })
    })
    .catch(()=>{
        res.json({
            status:"FAILED",
            message:"An error occured while hashing email data!"
        })

    })
};

//verify email
app.get("/verify/:userId/:uniqueString",(req,res)=>{
    const {userId,uniqueString}=req.params;

    UserVerification
    .find({userId})
    .then((result)=>{
        if(result.length>0){
            //user verification record exists so we proceed
            const {expiresAt}=result[0];
            const hashedUniqueString=result[0].uniqueString;

            //checking for expired unique string
            if(expiresAt<Date.now()){
                //record has expired
                UserVerification
                .deleteOne({userId})
                .then(result=>{
                    User.deleteOne({_id:userId})
                    .then(()=>{
                        const message="Link has expired. Please sign up again.";
                        res.redirect(`/verified?error=true&message=${encodeURIComponent(message)}`);


                    })
                    .catch((error)=>{
                        console.log(error);
                        const message="Clearing user with expired unique string failed.";
                        res.redirect(`/verified?error=true&message=${encodeURIComponent(message)}`);

                    })
                     
                })
                .catch((error)=>{
                    console.log(error);
                    const message="An error occured while clearing expired user verification record.";
                    res.redirect(`/verified?error=true&message=${encodeURIComponent(message)}`);

                })
            }
            else{
                //valid record exist
                bcrypt
                .compare(uniqueString,hashedUniqueString)
                .then(result=>{
                    if(result){
                        //strings match
                        User
                        .updateOne({_id:userId},{verified:true})
                        .then(()=>{
                            UserVerification
                            .deleteOne({userId})
                            .then(()=>{
                                res.sendFile(path.join(__dirname,"views/verified.html"))
                            })
                            .catch((error)=>{
                                console.log(error);
                                const message="An error occured while finalizing succesful verifiacation.";
                                res.redirect(`/verified?error=true&message=${encodeURIComponent(message)}`);

                            })
                        })
                        .catch((error)=>{
                            console.log(error);
                            const message="An error occured while updating user record to show verified.";
                            res.redirect(`/verified?error=true&message=${encodeURIComponent(message)}`);

                        })
                       

                    }
                    else{
                        //existing records but incorrect verification details
                        const message="Invalid verification details.";
                        res.redirect(`/verified?error=true&message=${encodeURIComponent(message)}`);


                    }
                })
                .catch(error=>{
                    const message="An error occured while comparing unique strings";
                    res.redirect(`/verified?error=true&message=${encodeURIComponent(message)}`);

                })

            }
        }
        else{
            //user verification record doesn't exist
            const message="Account record doesn't exist or has been verified already.Please sign up or log in ";
            res.redirect(`/verified?error=true&message=${encodeURIComponent(message)}`);

        }
    })
    .catch((error)=>{
        console.log(error);
        const message="An error occured while checking for existing user verification record";
        res.redirect(`/verified?error=true&message=${encodeURIComponent(message)}`);


    })

     
})
//verified page route
app.get("/verified",(req,res)=>{
res.sendFile(path.join(__dirname, "views/verified.html"));

})
//login
app.post('/login', async (req, res) => {
    const loginData = req.body;
    try{
        const user = await User.findOne({ username: loginData.username });
        if(!user){
            res.status(401).json({ msg: 'User not found' });
            return;
        }
        if(!user.verified){
            res.json({ message: "Email hasn't been verified yet. Check your inbox." });
            return;
        }
        if (user && bcrypt.compareSync(loginData.password, user.password)) {
            const token = jwt.sign({ username: user.username }, secret, { expiresIn: '1 hr' });
            const userProfile = {
                username: user.username,
                email: user.email,
            };
            res.json({ token, userProfile,msg:"redirecting to user's profile" }); // Return the token and user profile to the client
        } else {
            res.status(401).json({ msg: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ msg: 'Internal server error. Please try again later.' });
    }
});

app.get('/profile',async(req,res)=>{
    const token=req.headers.authorization;
    try{
        const decodedToken = jwt.verify(token,secret)
        if(token && decodedToken){
            const user = await User.findOne({ username: decodedToken.username });
            if (user) {
            const userProfile = {
                username: user.username,
                rollno: user.rollno,
              };
              res.send(userProfile);
        }
    }
    }catch(err){
        console.log(err);
        res.send("invalid token");
    }
})
app.get('/students', async (req, res) => {
    try {
        const users = await User.find({});
        res.send(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ msg: 'Internal server error. Please try again later.' });
    }
});
app.delete('/students/:username',async(req,res)=>{
    const usernameToDelete=req.params.username.trim();
    try{
        const userToDelete = await User.findOne({ username: usernameToDelete });
        if(userToDelete){
            await User.deleteOne({username:usernameToDelete});
            res.send("Student Deleted Sucessfully");
        }
        else{
            res.send("Student not found");
        }

    }catch(error){
        console.error('Error deleting user:', error);
        res.send({ msg: 'Internal server error. Please try again later.' });
    }
});
app.listen(process.env.PORT || 5000, () => {
    console.log('http://localhost:3000')
})