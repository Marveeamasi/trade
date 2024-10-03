'use client'
import { db } from '@/firebase';
import {arrayUnion, doc, getDoc, onSnapshot, setDoc, Timestamp, updateDoc} from 'firebase/firestore';
import React, { useEffect, useState } from 'react'
import moment from 'moment';
import axios from 'axios';
import emailjs from '@emailjs/browser';

export default function page({params}) {
    const userId = params.id.split("__")[1];
    const requestId = params.id.split("__")[0];
    const [amount, setAmount] = useState('');
    const[loading, setLoading] = useState(false);
    const [editable, setEditable] = useState('');
    const [selectedData, setSelectedData] = useState(null);

  useEffect(() => {
    const unSub = onSnapshot(doc(db, 'userTransactions', userId), (doc) => {
      if (doc.exists()) {
        const requests = doc.data().requests; 
        const selected = requests.filter((r) => r.id === requestId)[0];
        setSelectedData(selected);
      } else {
        console.error("User transaction document not found");
      }
    }, (error) => {
      console.error("Error fetching request data:", error);
    });

    return () => unSub();
  }, [userId, requestId]);

  useEffect(()=>{
    if(selectedData?.status === "pending" || selectedData?.status === "failed"){
      setEditable(true);
    }else{
      setEditable(false)
    }
  },[selectedData?.status])

  const templateParamsForAccept = {
    from_name: '4Elevenfxtrade',
    reply_to: "info@4xeleventrade.store",
    page_to: 'dashboard',
    type: 'notification from 4Elevenfxtrade',
    to_email: selectedData?.user,
    message: `Hi ${selectedData?.username || 'dear'}, your payment of ${amount} has been approved successfully, now your money grows weekly`,
  };

  const templateParamsForReject = {
    from_name: '4Elevenfxtrade',
    reply_to: "info@4xeleventrade.store",
    page_to: 'dashboard',
  type: 'notification from 4Elevenfxtrade',
    to_email: selectedData?.user,
    message: `Hi ${selectedData?.username || 'dear'}, your payment of ${amount} failed, please contact our customer service: info@4xeleventrade.store`,
  };

  const handleReject = async () => {
    if (!selectedData || !amount) return;
    setLoading(true);
    const updatedRequest = {
      ...selectedData,
      status: 'failed',
      date: Timestamp.now(),
      amount,
    };
  
    const requestRef = doc(db, 'userTransactions', userId);
    const userTransaction = await getDoc(requestRef);
    const requests = userTransaction.data().requests;
    const updatedRequests = requests.map((request) =>
      request.id === selectedData.id ? updatedRequest : request
    ); 
  
    try {
      await updateDoc(requestRef, { requests: updatedRequests });
      await emailjs.send(
        'service_ao75urn',
      'template_tdpbxb7', 
      templateParamsForReject,
      'MIRKY7yUv_4VJdUdi' 
      );
      setLoading(false);
      alert('Request rejected successfully');
      setAmount('');
    } catch (error) {
      setLoading(false);
      alert('Error rejecting request:', error);
    }
  };

  const runtherest = async() =>{
  
    const updatedRequest = {
      ...selectedData,
      status: 'approved',
      date: Timestamp.now(),
      amount:amount,
    };
  
    const requestRef = doc(db, 'userTransactions', userId);
    const userTransaction = await getDoc(requestRef);
    const requests = userTransaction.data().requests;
  
    const updatedRequests = requests.map((request) =>
      request.id === selectedData.id ? updatedRequest : request
    );
  
    // const sendToDatadb = async () => {
    //   const createdAtDate = new Date().toISOString();
    //   try {
    //     const res = await axios.post('/api/investment', {
    //       initialAmount: amountCheck,
    //       createdAtDate,
    //       userEmail: selectedData?.user,
    //       plan: selectedData?.plan,
    //     });
    //     console.log('Investment created to db:', res.data);
    //   } catch (error) {
    //     console.error('Error creating investment to db:', error);
    //     throw error; // Re-throw the error to stop execution if it fails
    //   }
    // };
  
    try {
      // Update user transaction in Firestore
      await updateDoc(requestRef, { requests: updatedRequests });
  
      // Update userCurrents collection
      await updateDoc(doc(db, 'userCurrents', userId), {
        currents: arrayUnion({
          id: id,
          plan: selectedData?.plan,
          date: Timestamp.now(),
          initial: amount,
          user: userId,
        })
      });
      await emailjs.send(
        'service_ao75urn',
      'template_tdpbxb7', 
      templateParamsForAccept,
      'MIRKY7yUv_4VJdUdi' 
      );
  
      // Save investment to database
      // await sendToDatadb();
  
      // Only show alert after all steps have been completed successfully
      setLoading(false);
      alert('Request accepted successfully');
    } catch (error) {
      setLoading(false);
      alert('Error accepting request:', error);
      console.error(error); // Log the error for debugging
    }
  }

  const handleUpdateReward = async (refId) => {
    const userRewardDoc = doc(db, 'userRewards', refId);
    try {
      const docSnapshot = await getDoc(userRewardDoc);
      if (docSnapshot.exists()) {
        const currentReward = docSnapshot.data().rewards || 0;
        const newReward = currentReward + 5;
  
        await updateDoc(userRewardDoc, { rewards: newReward });
        console.log('Reward updated successfully');
      } else {
        await setDoc(userRewardDoc, { rewards: 5 });
        console.log('Reward initialized successfully');
      }
      return runtherest();
    } catch (error) {
      console.error('Error updating reward:', error);
    }
  };
  
  const handleAccept = async () => {
    try {
      if (!selectedData || !amount) return;
      setLoading(true);
  
      // Update user reward
      if (selectedData?.refId) {
        await handleUpdateReward(selectedData?.refId);
      } else {
        await runtherest();
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };



  return (
    <div className='flex flex-col gap-5 p-10 max-sm:items-center w-full'>
      <h1 className='text-2xl mb-10'>Request by {selectedData?.user ? selectedData?.user : '...'}</h1>
      <div className='grid grid-cols-2 max-sm:grid-cols-1 gap-5'>
        <div className='flex flex-col gap-5 max-sm:items-center'>
     {selectedData?.img? <img src={selectedData?.img} alt='screenshot' className='w-[500px] h-[auto] object-cover grayscale max-sm:w-full'/> :
     <div className='w-[500px] h-[300px] bg-[#00eaff10] max-sm:w-full rounded-lg animate-pulse'></div>
     }
      <input type="number" maxLength={16} onChange={(e)=> setAmount(e.target.value)} placeholder="Enter amount" className="text-center flex justify-center outline-none bg-transparent border border-[#00eaff15] p-5 rounded-lg items-center w-[500px] mt-5 max-sm:w-full"/>
      </div>
      <div className='flex flex-col gap-5 max-sm:items-center p-10 rounded-lg'>
       <div className='w-full text-[#eee]'><b>Plan:</b> <i className='capitalize'>{selectedData?.plan ? selectedData?.plan : '...'}</i></div>
       <div className='w-full text-[#eee]'><b>Status:</b> <i className='capitalize'>{selectedData?.status ? selectedData?.status : '...'}</i></div>
       <div className='w-full text-[#eee]'><b>Amount:</b> <i className=''>${selectedData?.amount ? selectedData?.amount : '...'}</i></div>
       <div className='w-full text-[#eee]'><b>Date:</b> <i className=''>{selectedData?.date ? moment(selectedData?.date.toDate()).calendar() : '...'}</i></div>
      </div>
      </div>
   {amount && editable && <div className='grid grid-cols-2 gap-5'>
    <button onClick={handleReject} className='text-col border border-[#00eaff] font-bold rounded-lg p-5 hover:opacity-75'>Reject</button>
    <button onClick={handleAccept} className='text-black bg-col font-bold rounded-lg p-5 hover:opacity-75'>Accept</button>
   </div>

   }
     {loading && <div className='w-screen h-screen fixed z-[1111] flex justify-center items-center bg-[#000000ea]'>
      <img src="/loader.svg" alt="loading.."/></div>}
    </div>
  )
}
