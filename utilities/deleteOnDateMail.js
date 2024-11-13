const EmailModel = require("../Model/EmailModel");

// Permanently delete emails past deletion date
const permanentlyDeleteEmails = async () => {
    try {
        const currentDate = new Date();
        
        await EmailModel.deleteMany({ deletationdate: { $lte: currentDate } });
        console.log('Old emails permanently deleted.');
    } catch (error) {
        console.error('Error during scheduled email deletion:', error);
    }
};


module.exports = {  permanentlyDeleteEmails };
