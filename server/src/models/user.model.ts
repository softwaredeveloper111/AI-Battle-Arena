import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import config from "../config/config.js";



export interface IUser{
  username:string,
  email:string,
  password:string,
  emailVerified:boolean,
}

interface IUserMethods {
  comparePassword(password: string): Promise<boolean>;
}


const userSchema = new mongoose.Schema<IUser, mongoose.Model<IUser, {} , IUserMethods>,IUserMethods>({
  username:{
    type:String,
    trim:true,
    lowercase:true,
    required:[true,"username must be required"],
    minlength:[3,"username must be atleast 3 characters long"],
    maxlength:[20,"username must be at most 20 characters long"],
    match:[/^[a-z0-9_]{3,30}$/, 'please provide a valid username']
  },
  email:{
    type:String,
    trim:true,
    lowercase:true,
    required:[true,"email must be required"],
    unique:[true,"email already exists"],
    match:[/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Please enter a valid email address"]
  },
  password:{
    type:String,
    required:[true,"password must be required"],
    minlength:[6,"password must be atleast 6 characters long"],
    maxlength:[32,"password must be at most 32 characters long"],
    match:[/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,32}$/,"Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character"],  
    select:false
  },
  emailVerified:{
    type:Boolean,
    default:false
  }
},{timestamps:true});



/**
 * hash password before save into database
 */
userSchema.pre("save", async function() {
  if(!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password,config.BCRYPT_SALT_ROUNDS)
})


/**
 * compare password methods
 */
userSchema.methods.comparePassword = async function(password:string):Promise<boolean> {
  return await bcrypt.compare(password,this.password)
}


/**
 * remove password field and __v field from response
 */
userSchema.methods.toJSON = function() {
  const obj = this.toObject()
  delete obj.password
  delete obj.__v
  return obj
}





const User = mongoose.model<IUser, mongoose.Model<IUser, {}, IUserMethods>>("User",userSchema)

export default User