import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import referralCodeGenerator from 'referral-code-generator'
import db from '../firebase/config.js';
import { setDoc, doc, updateDoc, query, collection, where, getDocs, getDoc, arrayUnion, increment } from "firebase/firestore";
import { useContext } from 'react';
import { AmountContext } from '../App';
import { RotatingLines } from 'react-loader-spinner';
import close_eye from '../images/close_eye.png';
import apache_logo from '../images/apache_logo.png';



const Register = () => {

    const navigate = useNavigate();
    const auth = getAuth();
    const {invite_code} = useParams();
    const [otp, setOtp] = useState('');
    const [otpfield, setOTPfield] = useState('');
    const [mobno, setMobno] = useState('');
    const [pwd, setpwd] = useState('');
    const [cpwd, setCpwd] = useState('');
    const [wpwd, setwpwd] = useState('');
    const [invt, setInvt] = useState(invite_code);
    const amountDetails = useContext(AmountContext);
    const [loading, setLoading] = useState(false);
    const [text, setText] = useState('Loading');
    const [toasterShow, setToasterShow] = useState(false);
    const [toasterText, setToasterText] = useState('');

    const toaster = (text) => {
        setToasterText(text);
        setToasterShow(true);
        setTimeout(()=>{
            setToasterShow(false);
            //navigate('/mine');
        },5000);
    }

    const handleRegister = async () => {

        if(mobno.length!=10) {
            toaster('Invalid Mobile Number');
            return;
        }

        

        if(pwd!==cpwd) {
            toaster('Passwords do not match!');
            return;
        }

        if(pwd.length<6) {
            toaster('Password must contain at least 6 characters!');
            return;
        }

        if(otp!==otpfield) {
            toaster('Wrong OTP entered!');
            return;
        }
        console.log({ mobno, pwd, cpwd, wpwd, invt });
        const new_mobno = mobno + '@gmail.com';
        setLoading(true);
        createUserWithEmailAndPassword(auth, new_mobno, pwd)
            .then((userCredential) => {
                //console.log(userCredential);
                setText('Registration Successful!');
                setTimeout(() => {
                    navigate('/home');
                    setLoading(false);
                }, 1000);
                try {
                    //console.log(auth.currentUser.uid);
                    setDoc(doc(db, "users", auth.currentUser.uid), {
                        mobno,
                        pwd,
                        wpwd,
                        time: new Date(),
                        balance: amountDetails.invite_bonus,
                        recharge_amount: 0,
                        earning: 0,
                        user_invite:referralCodeGenerator.alpha('lowercase', 6),
                        parent_invt: invt,
                        grand_parent_int: '',
                        directRecharge:0,
                        indirectRecharge:0,
                        directMember:[],
                        indirectMember:[],
                        boughtLong:0,
                        showShort:0,
                        boughtShort:0,
                        lastWithdrawal:new Date()
                    }).then(() => {
                        const usersRef = collection(db, "users");
                        const q = getDocs(query(usersRef, where('user_invite', '==', invt)));
                        return q;
                    }).then((q) => {
                        const newRef = doc(db, 'users', auth.currentUser.uid);
                        //console.log(q);
                        updateDoc(newRef, {
                            parent_id: q._snapshot.docChanges[0].doc.key.path.segments[6],
                            grand_parent_int: q._snapshot.docChanges[0].doc.data.value.mapValue.fields.parent_invt
                        });
                        return q._snapshot.docChanges[0].doc.data.value.mapValue.fields.parent_invt.stringValue;
                    }).then((invite_code) => {
                        const usersRef2 = collection(db, "users");
                        const qw = getDocs(query(usersRef2, where('user_invite', '==', invite_code)));
                        return qw;
                    }).then((qw) => {
                        //console.log(qw);
                        updateDoc(doc(db, 'users', auth.currentUser.uid), {
                            grand_parent_id: qw._snapshot.docChanges[0].doc.key.path.segments[6],
                        });
                        const new_qw = getDocs(query(collection(db, "users"), where("user_invite", "==", qw._snapshot.docChanges[0].doc.data.value.mapValue.fields.parent_invt.stringValue)));
                        return new_qw;
                    }).then((new_qw)=>{
                        const newRef3 = doc(db, 'users', auth.currentUser.uid);
                        //console.log(qw, 'this is the last then');
                        //console.log(new_qw);
                        updateDoc(newRef3, {
                            great_grand_parent_id:new_qw._snapshot.docChanges[0].doc.key.path.segments[6],
                        })
                        const userData = getDoc(doc(db, 'users', auth.currentUser.uid));
                        return userData;
                    }).then((userData)=>{
                        console.log(userData.data());
                        updateDoc(doc(db, 'users', userData.data().parent_id), {
                            directMember: arrayUnion(auth.currentUser.uid)
                        });
                        updateDoc(doc(db, 'users', userData.data().grand_parent_id), {
                            indirectMember: arrayUnion(auth.currentUser.uid)
                        });
                        updateDoc(doc(db, 'users', userData.data().great_grand_parent_id), {
                            indirectMember: arrayUnion(auth.currentUser.uid)
                        });
                        updateDoc(doc(db, 'amounts', 'wgx5GRblXXwhlmx4XYok'), {userCount:increment(1)});
                    })
                    //console.log("Document written successfully");
                } catch (e) {
                    console.error("Error adding document: ", e);
                }

                setMobno('');
                setpwd('');
                setCpwd('');
                setwpwd('');
                setInvt('');
                setTimeout(()=>{
                    navigate('/home');
                },2000);
            })
            .catch((error) => {
                if(error.code=='auth/email-already-in-use') {
                    toaster('The provided email is already in use by an existing user.');
                }
                console.error(error.code, error.message);
            });

    }

    const handleOTPSend = (otpGenerated) => {

        if(mobno.length!==10) {
            toaster('Invalid Mobile Number');
            return;
        }
        
        setOTPfield(otpGenerated)
        fetch(`https://www.fast2sms.com/dev/bulkV2?authorization=27b58V4YOqBDMgWvNjapz1k9IHlrJfynC6w0hceRAZGoLimK3PuJC7OoiV4N2B6DjfwWKzb0lhgEetPH&variables_values=${otpGenerated}&route=otp&numbers=${mobno}`)
            .then((response) => {
                //console.log(response);
                toaster('OTP sent successfully');
            })
            .catch(error => toaster('Something went wrong'));
    }
//[#0096D5]
    return (
        <div className='h-screen relative'>
            {toasterShow?<div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'>
                <div className='flex gap-2 bg-black opacity-80 text-white px-2 py-1 rounded-md'>
                    <div>{toasterText}</div>
                </div>
            </div>:null}
            {loading ? <div className='flex gap-2 bg-black text-white py-2 px-2  rounded-md opacity-70 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'>
                {text==='Loading' ? <div>
                    <RotatingLines strokeColor='white' width='20' />
                </div> : null}
                <div className='text-sm'>{text}</div>
            </div> : null}
            <div className='text-center bg-orange-500 font-sans text-white pt-2 text-lg 
        pb-2'> <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 absolute left-2 cursor-pointer hover:bg-white hover:stroke-black hover:rounded-full transition rounded-full ease-in-out delay-150 duration-200">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Register</div>
            <div className='text-center'>
                <img src={apache_logo} alt="hp_logo" className='m-auto md:w-1/5 sm:w-1/5 my-0' width={300} />
            </div>
            <div className="box mb-20 border-2 m-auto  rounded-xl border-solid lg:w-2/5 w-4/5 shadow-xl p-4 w-50% flex flex-col">
                <div className='outline-none flex items-center justify-between mb-2 border-b-2 border-gray-300 rounded-full px-2'>
                    <div className='text-orange-500 border-r-2 border-gray-400 px-3 w-[18%]'>+91</div>
                    <div className='w-[85%]'>
                        <input value={mobno} onChange={e => setMobno(e.target.value)} type="text"
                            className='p-1 w-full  outline-none rounded-br-full rounded-tr-full' placeholder='Please enter a valid phone number' name="phoneno" id="phoneno" />
                    </div>
                </div>
                <div className='flex border-b-2 border-gray-300 rounded-full mb-2 px-2'>
                    <input type="text" onChange={e => setOtp(e.target.value)} className='p-1 w-[90%] outline-none rounded-full' placeholder='Please enter the OTP' name="otp" id="otp" />
                    <button className='bg-orange-500 text-white text-xs mr-1 px-4 my-1  rounded-full' onClick={() => handleOTPSend(String(Math.floor(100000 + Math.random() * 900000)))}>OTP</button>
                </div>
                <div className='flex justify-between items-center mb-2 outline-none border-b-2 border-gray-300 rounded-full px-2'>
                    <input value={pwd} onChange={e => setpwd(e.target.value)} type="password"
                        className='p-1 outline-none  rounded-full w-[90%]' placeholder='Please enter login password' name="passowrd" id="pass" />
                    <img src={close_eye} alt="close_eye" width={30} className="p-1" />
                </div>

                <div className='flex justify-between items-center mb-2 outline-none border-b-2 border-gray-300 rounded-full px-2'>
                    <input value={cpwd} onChange={e => setCpwd(e.target.value)} type="password"
                        className='p-1 outline-none  rounded-full w-[90%]' placeholder='Please confirm the login password' name="cnfpass" id="cnfpass" />
                    <img src={close_eye} alt="close_eye" width={30} className="p-1" />
                </div>

                <div className='flex justify-between items-center mb-2 outline-none border-b-2 border-gray-300 rounded-full px-2'>
                    <input value={wpwd} onChange={e => setwpwd(e.target.value)} type="password"
                        className='p-1 outline-none  rounded-full w-[90%]' placeholder="Please enter the Withdrawal password" name="withpassword" id="wthpass" />
                    <img src={close_eye} alt="close_eye" width={30} className="p-1" />
                </div>

                <input value={invt} onChange={e => setInvt(e.target.value)} type="text" className='p-1 mb-2  outline-none border-b-2 border-gray-300 rounded-full' placeholder='Invitation code' name="invite_code" id="inv_code" />

                <button onClick={handleRegister} className='bg-orange-500 text-white pt-1 pb-1 rounded-full text-lg'>Register</button>
                <div onClick={() => navigate('/login')} className='cursor-pointer text-center text-gray-500 mt-2 p-2 mb-2 border-2  rounded-full'>
                    Already have an account, log in
                </div>
            </div>
        </div>
    )
}

export default Register