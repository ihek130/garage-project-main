const express= require('express')
const router = express.Router()

const {postdata,getdata,getcusterexcel,updatedata,deletedata} =require('../Controller/expensesController') ;

//Get Request All and By ID

router.route('/post/Eexpenses').post(postdata)
router.route('/getexcel/:id').get(getcusterexcel)
router.route('/get/Eexpenses').get(getdata)
router.route('/get/E-expenses').get(getdata) // Add alias for frontend compatibility
router.route('/get/Expenses').get(getdata) // Add alias for frontend compatibility
router.route('/get/expense').get(getdata) // Add alias for frontend compatibility
router.route('/get').get(getdata) // Add alias for frontend compatibility
router.route('/delete/:id').delete(deletedata)
router.route('/update/:id').put(updatedata)



module.exports= router;