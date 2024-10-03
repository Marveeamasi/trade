'use client'
import { db } from '@/firebase';
import {doc, getDoc, onSnapshot, Timestamp, updateDoc} from 'firebase/firestore';
import moment from 'moment';
import React, { useEffect, useState } from 'react'
import { IoMdThumbsUp } from "react-icons/io";
import { IoHandLeft } from "react-icons/io5";
import { IoMdThumbsDown } from "react-icons/io";
import emailjs from '@emailjs/browser';

export default function With({plan, status,amount,date,id,userId,user,address,payOption,username,isReward, rewardAmount, currentAmount, setLoading}) {
    const [textCol, setTextCol] = useState('')
    const [editable, setEditable] = useState('');
    useEffect(()=>{
        if(status==='approved'){
            setTextCol("text-[#00ffff80]");
        }else if(status==='pending'){
             setTextCol("text-[#ffff0080]");
        }else if(status==='failed'){
            setTextCol("text-[#ff00ff80]");
        }
    },[status])

    useEffect(()=>{
      if(status === "pending" || status === "failed"){
        setEditable(true);
      }else{
        setEditable(false)
      }
    },[status])

    const selectedData = {
      plan: plan,
      status: status,
      amount: amount,
      date: date,
      userId: userId,
      id:id,
      address: address,
      payOption: payOption,
      user: user,
  }

    const templateParamsForAccept = {
        from_name: '4Elevenfxtrade',
        reply_to: 'info@4xeleventrade.store',
        to_email: user? user : 'amasimarvellous@gmail.com',
        page_to: 'dashboard',
        type: 'notification from 4Elevenfxtrade',
        message: `Hi ${username || 'dear'}, your withdrawal of ${amount} from ${plan} has been approved, incase you haven't been credited in less than 23 hrs please contact our customer service: info@4xeleventrade.store`, 
    };
  
    const templateParamsForReject = {
      from_name: '4Elevenfxtrade',
        reply_to: 'info@4xeleventrade.store',
        to_email: user? user : 'amasimarvellous@gmail.com',
        page_to: 'dashboard',
        type: 'notification from 4Elevenfxtrade',
        message: `Hi ${username || 'dear'}, your withdrawal of ${amount} from ${plan} failed, please contact our customer service: info@4xeleventrade.store`, 
     };
  
    const handleReject = async () => {
      if (!selectedData) return;
      setLoading(true);
      
      // Update Firestore first
      try {
        const updatedRequest = {
          ...selectedData,
          status: 'failed',
          date: Timestamp.now(),
        };
      
        const requestRef = doc(db, 'userWithdrawals', userId);
        const userTransaction = await getDoc(requestRef);
        const requests = userTransaction.data().withdrawals;
        const updatedRequests = requests.map((request) =>
          request.id === selectedData.id ? updatedRequest : request
        );
        
        await updateDoc(requestRef, { withdrawals: updatedRequests });
        console.log('Firestore updated successfully');
      } catch (error) {
        setLoading(false);
        alert('Error updating Firestore for rejecting withdrawal:', error);
        return; // Stop execution if Firestore update fails
      }
    
      // Send email
      try {
        await emailjs.send(
          'service_ao75urn',
        'template_tdpbxb7', 
        templateParamsForReject,
        'MIRKY7yUv_4VJdUdi' 
        );
        console.log('Email sent successfully');
      } catch (error) {
        alert('Error sending rejection email:', error);
      } finally {
        setLoading(false);
        alert('Withdrawal rejected successfully');
      }
    };
    
    const handleAccept = async () => {
      if (!selectedData) return;
      setLoading(true);
    
      // Update Firestore
      try {
        const updatedRequest = {
          ...selectedData,
          status: 'approved',
          date: Timestamp.now(),
        };
      
        const requestRef = doc(db, 'userWithdrawals', userId);
        const userTransaction = await getDoc(requestRef);
        const requests = userTransaction.data().withdrawals;
        const updatedRequests = requests.map((request) =>
          request.id === selectedData.id ? updatedRequest : request
        );
        
        await updateDoc(requestRef, { withdrawals: updatedRequests });
        
        async function updateCurrent(userId, currentId) {
          if(rewardAmount && isReward){
            console.log('it is reward');
            const userRewardDoc = doc(db, 'userRewards', userId);
           await getDoc(userRewardDoc).then((docSnapshot) => {
                    const currentReward = docSnapshot.data().rewards || 0;
                    const newReward = currentReward - parseFloat(amount);
        
                   updateDoc(userRewardDoc, { rewards: newReward })
                        .then(() => {
                            console.log('Reward updated successfully');
                        })
                        .catch((error) =>{ console.error('Error updating reward:', error)
                          setLoading(false)
                        });
                      })
      }else{
          console.log('its withdrawals from currents');
          const userCurrentsDoc = await getDoc(doc(db, 'userCurrents', userId));
          const currentsData = userCurrentsDoc.data().currents || [];
          const selectedCurrentIndex = currentsData.findIndex((c) => c.id === currentId);
          if (selectedCurrentIndex === -1) {
            console.error('Selected current not found');
            return;
          }
          const updatedCurrent = { ...currentsData[selectedCurrentIndex], date: Timestamp.now(), remainder: parseFloat(currentAmount) - parseFloat(amount), modifier: 0};
          const updatedCurrentsData = [...currentsData];
          updatedCurrentsData[selectedCurrentIndex] = updatedCurrent;
          await updateDoc(doc(db, 'userCurrents', userId), { currents: updatedCurrentsData });      
          console.log('Current updated successfully');    
        
      }
        }
        await updateCurrent(userId, id);
        
        console.log('Firestore updated and current updated successfully');
      } catch (error) {
        setLoading(false);
        alert('Error updating Firestore for accepting withdrawal:', error);
        return; // Stop execution if Firestore update fails
      }
    
      // Send email
      try {
        await emailjs.send(
          'service_ao75urn',
          'template_tdpbxb7', 
          templateParamsForAccept,
          'MIRKY7yUv_4VJdUdi' 
        );
        console.log('Email sent successfully');
      } catch (error) {
        alert('Error sending approval email:', error);
      } finally {
        setLoading(false);
        alert('Withdrawal accepted successfully');
      }
    };
    
  return (
    <div className='grid grid-cols-4 p-3 text-sm gap-2 font-[200] bg-[rgb(0,234,255,0.01)] rounded-lg max-xsm:text-[11px]'>
        <a href={"mailto:" + user + "?subject=" + encodeURIComponent("Update from 4Elevenfxtrade") + "&body=" + encodeURIComponent("Hi"+user?.substring(0,6))}>{user}</a>
        <div>{plan.substring(0,7)}</div>
        <div>${amount.toLocaleString()}</div>
       {address && <div>{address}</div>}
        {payOption && <div>{payOption}</div>}
       {status==='approved' && <IoMdThumbsUp className={`${textCol} text-xl`}/>}
       {status==='pending' && <IoHandLeft className={`${textCol}  text-xl`}/>}
       {status==='failed' && <IoMdThumbsDown className={`${textCol}  text-xl`}/>}
       <div>{moment(date.toDate()).calendar()}</div>
      {editable && <div className='p-5 flex justify-start items-center gap-5'>
       <button className='p-2 w-20 rounded-md accept-btn text-black hover:opacity-75 font-bold' onClick={handleAccept}>Accept</button>
       <button className='p-2 w-20 rounded-md reject-btn text-black hover:opacity-75 font-bold' onClick={handleReject}>Reject</button>
       </div>}
    </div>
  )
}
