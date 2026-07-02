import LoanApplication from '../models/LoanApplication.js';
import APIFeatures from '../utils/apiFeatures.js';

export const getApplications = async (req, res) => {
  try {
    const features = new APIFeatures(LoanApplication.find({ isActive: true }), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const applications = await features.query
      .populate('customer', 'name email phone')
      .populate('project', 'name slug')
      .populate('plot', 'plotNumber');

    const total = await LoanApplication.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      count: applications.length,
      total,
      data: applications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getApplication = async (req, res) => {
  try {
    const application = await LoanApplication.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('project', 'name slug')
      .populate('plot', 'plotNumber price');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Loan application not found' });
    }

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createApplication = async (req, res) => {
  try {
    const { monthlyIncome, existingEmi = 0, age, desiredLoanAmount } = req.body;

    const maxEMI = monthlyIncome * 0.55 - existingEmi;

    const interestRate = 8.7;
    const monthlyRate = interestRate / 12 / 100;
    const tenureMonths = 240;

    let maxEligibleLoan = 0;
    if (monthlyRate > 0) {
      maxEligibleLoan = maxEMI * ((Math.pow(1 + monthlyRate, tenureMonths) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)));
    }

    const eligibleAmount = Math.min(desiredLoanAmount || Infinity, maxEligibleLoan);

    const actualEMI = monthlyRate > 0 && eligibleAmount > 0
      ? (eligibleAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1)
      : 0;

    const application = await LoanApplication.create({
      ...req.body,
      customer: req.user._id,
      interestRate,
      emi: Math.round(actualEMI * 100) / 100,
      tenure: tenureMonths,
    });

    res.status(201).json({
      success: true,
      data: {
        ...application.toObject(),
        calculation: {
          maxEMI: Math.round(maxEMI * 100) / 100,
          interestRate,
          tenureMonths,
          maxEligibleLoan: Math.round(maxEligibleLoan * 100) / 100,
          monthlyEMI: Math.round(actualEMI * 100) / 100,
          eligible: eligibleAmount >= desiredLoanAmount,
          reason: eligibleAmount >= desiredLoanAmount
            ? 'You are eligible for the desired loan amount'
            : `Eligible amount is lower than desired. Maximum eligible: ₹${Math.round(maxEligibleLoan)}`,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateApplication = async (req, res) => {
  try {
    const application = await LoanApplication.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Loan application not found' });
    }

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyApplications = async (req, res) => {
  try {
    const features = new APIFeatures(
      LoanApplication.find({ customer: req.user._id, isActive: true }),
      req.query
    )
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const applications = await features.query
      .populate('project', 'name slug')
      .populate('plot', 'plotNumber price');

    const total = await LoanApplication.countDocuments({ customer: req.user._id, isActive: true });

    res.status(200).json({
      success: true,
      count: applications.length,
      total,
      data: applications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getApplicationStats = async (req, res) => {
  try {
    const stats = await LoanApplication.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$loanAmount' },
        },
      },
      { $project: { status: '$_id', count: 1, totalAmount: 1, _id: 0 } },
    ]);

    const totalApplications = await LoanApplication.countDocuments({ isActive: true });
    const totalLoanAmount = await LoanApplication.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$loanAmount' } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats,
        totalApplications,
        totalLoanAmount: totalLoanAmount.length > 0 ? totalLoanAmount[0].total : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
