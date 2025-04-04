include("Tektronix.js");
include("TestQRRHP016.js")
include("Sic_GetData.js")
include("TEK_GetData.js")
include("CaldVdt.js")

// Calibration setup parameters
cal_Rshunt = 1000;	// uOhm
DirectCurrentTest = 1000; // in A
DirectCurrentRateTest = 10; // in A/us
DirectVoltageTest = 1500; // in V
DirectVoltageRateTest = 20; // in V/us
//
UnitDCUEn = 3;
UnitRCUEn = 3;
//
MaxPort = 1;
MinPort = 2;
//
def_UseSaveImage = true; 
//
SetCurrentTest = [320, 500, 1000, 1500, 2000, 2500, 3000, 3200]; // in A  320, 500, 1000, 1500, 2000, 2500, 3000, 3200
CurrentRateN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
CurrentRate = [ 1, 1.5, 2, 5, 10, 15, 20, 30, 50, 60, 100]; // in А/us  1, 1.5, 2, 5, 10, 15, 20, 30, 50, 60, 100
IrrMeasured = [150, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50]; // in A
SetVoltage = [402, 1000, 1800];	// in V 402, 1000, 2000, 3000, 4355
SetVoltageRate = [20, 50, 100, 200]; // in V/us 20, 50, 100, 200

CurrentRateStartTestIndex = 0;
CurrentRateFinishTestIndex = 10;
CurrentSetStartTestIndex = 0;
CurrentSetFinishTestIndex = 4;
//
QrrGOST = 1;
//
cal_Iterations = 1;
//		

// Counters
cal_CntTotal = 0;
cal_CntDone = 0;

// Channels
cal_chMeasureI = 1;
cal_chMeasureU = 3;

// Results storage
cal_Trr = [];
cal_Irr = [];
cal_Qrr = [];
cal_Tq = [];
//
cal_IdcSet = []; 
cal_IrcSet = [];
cal_dIdtSet = [];
//
cal_IdcUnit = [];
cal_IrcUnit = [];
cal_dIdtUnit = [];

// Tektronix data
cal_TrrSc = [];
cal_IrrSc = [];
cal_QrrSc = [];
cal_TqSc = [];
//
cal_IdcSc = [];
cal_fIdcSc = [];
cal_IrcSc = [];
cal_dIdtSc = [];

// Relative error
cal_TrrErr = [];
cal_IrrErr = [];
cal_QrrErr = [];
cal_TqErr = [];
//
cal_IdcSetErr = [];
cal_fIdcSetErr = [];
cal_IrcSetErr = [];
cal_dIdtSetErr = [];
//
cal_IdcUnitErr = [];
cal_IrcUnitErr = [];
cal_dIdtUnitErr = [];

// Calibrate
cal_IdcSetCal = [];
cal_IdcScCal = [];
cal_IdcSetErrCal = [];

cal_fIdcScCal = [];
cal_fIdcSetErrCal = [];

cal_IrcSetCal = [];
cal_IrcScCal = [];
cal_IrcSetErrCal = [];

cal_dIdtSetCal = [];
cal_dIdtScCal = [];
cal_dIdtSetErrCal = [];

// Correction
Сal_IdSetCorr = []; 
Сal_IHSSCorr = [];
Сal_fIdSetCorr = [];
Сal_IrSetCorr = [];
Сal_dIdtSetCorr = [];

// Data arrays
cdidt_scatter = [];

//-------------------------------------------------------------------------------------------------------------------------------------------
// Функция инициализации портов блока и осциллографа для калибровки  

function CAL_Init(portDevice, portTek, channelMeasureI, channelMeasureU)
{
	if (channelMeasureI < 1 || channelMeasureU > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	cal_chMeasureI = channelMeasureI;
	cal_chMeasureU = channelMeasureU;

	// Init device port
	dev.Disconnect();
	dev.Connect(portDevice);

	// Init Tektronix port
	TEK_PortInit(portTek);
	TEK_GD_Init(portTek);
	
	// Tektronix init
	for (var i = 1; i <= 4; i++)
	{
		if (i == channelMeasureI || i == channelMeasureU)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}

	Cal_Reg(1);
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Верификация Id,Ir,dI/dt

function CAL_VerifyCurrent()
{
	CAL_ResetA();

	dev.w(153,1);
	dev.c(110);

	// Tektronix init
	CAL_TekInitCurrent();

	if (CAL_CollectCurrent(cal_Iterations))
	{
		// Plot relative error distribution
		scattern(cal_IdcSc, cal_IdcSetErr, "Current Direct (in A)", "Error (in %)", "Current Direct Set error");
		scattern(cal_IrcSc, cal_IrcSetErr, "Current Revers (in A)", "Error (in %)", "Current Revers Set error");
		scattern(cal_IdcSc, cal_IdcUnitErr, "Current Direct (in A)", "Error (in %)", "Current Direct Measure error");
		scattern(cal_IrcSc, cal_IrcUnitErr, "Current Revers (in A)", "Error (in %)", "Current Revers Measure error");
		scattern(cal_IdcSet, cal_dIdtSetErr, "Set Current (in A)", "Error (in %)", "dIdt Set error");
		scattern(cal_dIdtSc, cal_dIdtUnitErr, "dIdt (in A/us)", "Error (in %)", "dIdt Measure error");
	}	

	dev.w(153,0);
	dev.c(111);
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Верификация fId

function CAL_VerifyfId()
{
	CAL_ResetA();

	dev.w(153,1);
	dev.c(110);

	// Tektronix init
	CAL_TekInitfIdCal();

	if (CAL_CollectfId(cal_Iterations))
	{

		// Plot relative error distribution
		scattern(cal_fIdcSc, cal_fIdcSetErr, "Front Current Direct (in A)", "Error (in %)", "Front Current Direct Set error");

	}	

	//dev.w(153,0);
	dev.c(111);
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Верификация измерения Tq

function CAL_VerifyTq()
{		
	CAL_ResetA();
	
	dev.w(153,1);
	dev.c(110);
	
	// Tektronix init
	CAL_TekInitTq();

	if (CAL_CollectTq(cal_Iterations))
	{
		CAL_SaveTq("QSU_Tq");
		
		// Plot relative error distribution
		scattern(cal_TqSc, cal_TqErr, "Tq (in us)", "Error (in %)", "Tq relative error");
	}
	
	dev.w(153,0);
	dev.c(111);
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Верификация измерения Irr,Trr и Qrr

function CAL_VerifyQrr()
{		
	CAL_ResetA();
	
	dev.w(153,1);
	dev.c(110);
	
	// Tektronix init
	CAL_TekInitQrr();

	if (CAL_CollectQrr(cal_Iterations))
	{
		CAL_SaveIrr("QSU_Irr");
		CAL_SaveTrr("QSU_Trr");
		CAL_SaveQrr("QSU_Qrr");
		
		// Plot relative error distribution
		scattern(cal_IrrSc, cal_IrrErr, "Irr (in A)", "Error (in %)", "Irr relative error");
		scattern(cal_TrrSc, cal_TrrErr, "Trr (in us)", "Error (in %)", "Trr relative error");
		scattern(cal_QrrSc, cal_QrrErr, "Qrr (in uQ)", "Error (in %)", "Qrr relative error");
		scattern(cal_IrrSc, cal_TrrErr, "Irr (in A)", "Trr Error (in %)","Trr relative error in Irr")
	}
	
	dev.w(153,0);
	dev.c(111);
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Верификация измерения dV/dt

function CAL_VerifydVdt()
{
	CAL_ResetA();
	
	dev.w(153,1);
	dev.c(110);

	// Tektronix init
	CAL_TekInitdVdt();
	
	if (CAL_CollectdVdt(cal_Iterations))
	{
		CdVdt_SaveRate("dvdt_rate", "dvdt_rate_sum");
		CdVdt_SaveV("dvdt_v","dvdt_v_sum");
		
		// Plot relative error distribution
		scattern(cdvdt_rate_sc, cdvdt_rate_err, "Voltage / Time (in V/us)", "Error relative Rate (in %)", "dVdt relative error " + SetVoltageRate.join(", ") + " V/us");
		// scattern(cdvdt_v_sc, cdvdt_rate_err, "Voltage (in V)", "Error relative Voltage (in %)", "dVdt relative error " + SetVoltageRate.join(", ") + " V/us");
		scattern(cdvdt_v_sc, cdvdt_v_err, "Voltage (in V)", "Error relative Voltage (in %)", "Ud relative error " + SetVoltage[0] + "..." + SetVoltage[SetVoltage.length - 1] + " V");
	
		scattern(cdvdt_rate_sc, cdvdt_rate_err_sum, "Voltage / Time (in V/us)", "Error relative Rate (in %)", "dVdt summary error " + SetVoltageRate.join(", ") + " V/us");
		// scattern(cdvdt_v_sc, cdvdt_rate_err_sum, "Voltage (in V)", "Error relative Voltage (in %)", "dVdt summary error " + SetVoltageRate.join(", ") + " V/us");
		scattern(cdvdt_v_sc, cdvdt_v_err_sum, "Voltage (in V)", "Error relative Voltage (in %)", "Ud summary error " + SetVoltage[0] + "..." + SetVoltage[SetVoltage.length - 1] + " V");
	}
	
	dev.w(153,0);
	dev.c(111);
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Калибровка IdSet (компенсации) 

function CAL_CalibrateIdSet()
{
	CAL_ResetA();
	CAL_ResetIdSetCal();

	dev.w(153,1);
	dev.c(110);

	// Tektronix init
	CAL_TekInitCurrent();

	if (CAL_CollectIdCal(cal_Iterations))
	{
		CAL_SaveIdc("QSU_Idc");

		// Plot relative error distribution
		scattern(cal_IdcScCal, cal_IdcSetErrCal, "Current Direct (in A)", "Error (in %)", "Current Direct Set error");

		// Calculate correction
		
		Сal_IdSetCorr = CGEN_GetCorrection2("QSU_Idc");

		CAL_SetCoefIdSet(Сal_IdSetCorr[0], Сal_IdSetCorr[1], Сal_IdSetCorr[2]); 

		CAL_PrintCoefIdSet();		
	}

	dev.w(153,0);
	dev.c(111);
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Калибровка IdHSS 

function CAL_CalibrateIHSS()
{
	CAL_ResetA();
	CAL_ResetIHSSCal();

	dev.w(153,1);
	dev.c(110);

	// Tektronix init
	CAL_TekInitCurrent();

	if (CAL_CollectCurrent(cal_Iterations))
	{
		CAL_SaveIdHSS("QSU_IdHSS");
		CAL_SaveIrHSS("QSU_IrHSS");
		CAL_SavedIdtHSS("QSU_dIdtHSS");


		// Plot relative error distribution
		scattern(cal_IdcSc, cal_IdcUnitErr, "Current Direct (in A)", "Error (in %)", "Current Direct Measure error");
		scattern(cal_IrcSc, cal_IrcUnitErr, "Current Revers (in A)", "Error (in %)", "Current Revers Measure error");
		scattern(cal_dIdtSc, cal_dIdtUnitErr, "dIdt (in A/us)", "Error (in %)", "dIdt Measure error");

		// Calculate correction
		
		Сal_IHSSCorr = CGEN_GetCorrection("QSU_IHSS");

		CAL_SetCoefIHSS(Сal_IHSSCorr[0], Сal_IHSSCorr[1]); 

		CAL_PrintCoefIHSS();		
	}

	dev.w(153,0);
	dev.c(111);
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Калибровка fIdSet (переднего фронта) 

function CAL_CalibratefIdSet()
{
	CAL_ResetA();
	CAL_ResetfIdSetCal();

	dev.w(153,1);
	dev.c(110);

	// Tektronix init
	CAL_TekInitfIdCal();

	if (CAL_CollectfIdCal(cal_Iterations))
	{
		CAL_SavefIdc("QSU_fIdc");

		// Plot relative error distribution
		scattern(cal_fIdcScCal, cal_fIdcSetErrCal, "Front Current Direct (in A)", "Error (in %)", "Front Current Direct Set error");

		// Calculate correction
		
		Сal_fIdSetCorr = CGEN_GetCorrection("QSU_fIdc");

		CAL_SetCoeffIdSet(Сal_fIdSetCorr[0], Сal_fIdSetCorr[1]); 

		CAL_PrintCoeffIdSet();		
	}

	dev.w(153,0);
	dev.c(111);
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Калибровка IrSet 

function CAL_CalibrateIrSet()
{
	CAL_ResetA();
	CAL_ResetIrSetCal();

	dev.w(153,1);
	dev.c(110);

	// Tektronix init
	CAL_TekInitCurrent();

	if (CAL_CollectIrCal(cal_Iterations))
	{
		CAL_SaveIrc("QSU_Irc");

		// Plot relative error distribution
		scattern(cal_IrcScCal, cal_IrcSetErrCal, "Current Revers (in A)", "Error (in %)", "Current Revers Set error");

		// Calculate correction
		
		Сal_IrSetCorr = CGEN_GetCorrection("QSU_Irc");

		CAL_SetCoefIrSet(Сal_IrSetCorr[0], Сal_IrSetCorr[1]); 

		CAL_PrintCoefIrSet(); 		
	}

	dev.w(153,0);
	dev.c(111);
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Калибровка dI/dtSet 

function CAL_CalibratedIdtSet()
{
	CAL_ResetA();
	CAL_ResetdIdtSetCal();

	dev.w(153,1);
	dev.c(110);

	// Tektronix init
	CAL_TekInitCurrent();

	if (CAL_CollectdIdtCal(cal_Iterations))
	{
		CAL_SavedIdtSet("QSU_dIdt");

		// Plot relative error distribution
		scattern(cal_IdcSet, cal_dIdtSetErrCal, "Set Current (in A)", "Error (in %)", "dIdt Set error");

		// Calculate correction
		
		Сal_dIdtSetCorr = CGEN_GetCorrection2("QSU_dIdt");
		CAL_SetCoefdIdtSet(Сal_dIdtSetCorr[0], Сal_dIdtSetCorr[1], Сal_dIdtSetCorr[2]); 
		CAL_PrintCoefdIdtSet(); 		
	}

}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Сбор данных для верификации Id,Ir и dI/dt

function CAL_CollectCurrent(IterationsCount)
{
	cal_CntTotal = SetCurrentTest.length * CurrentRateN.length * IterationsCount;
	cal_CntDone = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentRateN.length; j++)
		{
			for (var k = 0; k < SetCurrentTest.length; k++)
			{	

				TEK_Send("horizontal:scale "  + ((SetCurrentTest[k] / CurrentRate[j]) * 1e-6) * 0.5);
				CAL_TekScale(cal_chMeasureI, SetCurrentTest[k] * cal_Rshunt / 1e6 * 2);
				sleep(1000);

				if((SetCurrentTest[k] / CurrentRate[j]) >= 500)
				{	
					print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
					break;
				}		
				else
				{
					qrr_print = 0;
					print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
					QRR_Start(0, SetCurrentTest[k], CurrentRateN[j], DirectVoltageTest, DirectVoltageRateTest);
					qrr_print = 1;
				}
			
				sleep(1000);

				// Set data
			
				var IdcSet = dev.r(129);

				var IrcSet = -(IdcSet);

				cal_IdcSet.push(IdcSet);
				cal_IrcSet.push(IrcSet);

				var dIdtSet = CurrentRate[j];
				cal_dIdtSet.push(dIdtSet);

				// Unit data
			
				var IdcUnit = dev.r(214);
				cal_IdcUnit.push(IdcUnit);
			
				var IrcUnit = -(dev.r(211) / 10);
				cal_IrcUnit.push(IrcUnit);

				var dIdtUnit = dev.r(215) / 10;
				cal_dIdtUnit.push(dIdtUnit);

				// Scope data
				var ScopeData = CAL_MeasureCurrent(cal_chMeasureI);
				var IdcSc = parseFloat(ScopeData[0]).toFixed(2);
				var IrcSc = parseFloat(ScopeData[1]).toFixed(2);
				var dIdtSc = parseFloat(ScopeData[2]).toFixed(2);

				cal_IdcSc.push(IdcSc);
				cal_IrcSc.push(IrcSc);
				cal_dIdtSc.push(dIdtSc);

				// Relative Set error
				var IdcSetErr = ((IdcSet - IdcSc) / IdcSc * 100).toFixed(2);
				var IrcSetErr = ((IrcSet - IrcSc) / IrcSc * 100).toFixed(2);
				var dIdtSetErr = ((dIdtSet - dIdtSc) / dIdtSc * 100).toFixed(2);
			
				cal_IdcSetErr.push(IdcSetErr);
				cal_IrcSetErr.push(IrcSetErr);
				cal_dIdtSetErr.push(dIdtSetErr);

				// Relative Unit error
				var IdcUnitErr = ((IdcUnit - IdcSc) / IdcSc * 100).toFixed(2);
				var IrcUnitErr = ((IrcUnit - IrcSc) / IrcSc * 100).toFixed(2);
				var dIdtUnitErr = ((dIdtUnit - dIdtSc) / dIdtSc * 100).toFixed(2);
			
				cal_IdcUnitErr.push(IdcUnitErr);
				cal_IrcUnitErr.push(IrcUnitErr);
				cal_dIdtUnitErr.push(dIdtUnitErr);
			
				// Print results
				print("");
				print("IdcSet,		A: " + IdcSet);
				print("IdcUnit,	A: " + IdcUnit);
				print("IdcSc,		A: " + IdcSc);
				print("IdcSetErr,	%: " + IdcSetErr);
				print("IdcUnitErr,	%: " + IdcUnitErr);
				print("");
				print("IrcSet,		A: " + IrcSet);
				print("IrcUnit,	A: " + IrcUnit);
				print("IrcSc,		A: " + IrcSc);
				print("IrcSetErr,	%: " + IrcSetErr);
				print("IrcUnitErr,	%: " + IrcUnitErr);
				print("");
				print("dIdtSet,	A/us: " + dIdtSet);
				print("dIdtUnit,	A/us: " + dIdtUnit);
				print("dIdtSc,		A/us: " + dIdtSc);
				print("dIdtSetErr,	%: " + dIdtSetErr);
				print("dIdtUnitErr,	%: " + dIdtUnitErr);
				print("--------------------");
			
				if (anykey()) return 0;
			}
		}
	}
	return 1;
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Сбор данных для верификации fId

function CAL_CollectfId(IterationsCount)
{
	cal_CntTotal = SetCurrentTest.length * CurrentRateN.length * IterationsCount;
	cal_CntDone = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentRateN.length; j++)
		{
			for (var k = 0; k < SetCurrentTest.length; k++)
			{	
				TEK_TriggerInit(cal_chMeasureI, SetCurrentTest[k] * cal_Rshunt / 1e6 * 0.8);
				CAL_TekScale(cal_chMeasureI, SetCurrentTest[k] * cal_Rshunt / 1e6 * 1.2);
				sleep(1000);

				if((SetCurrentTest[k] / CurrentRate[j]) >= 500)
				{	
					print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
					break;
				}		
				else
				{
					qrr_print = 0;
					print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
					QRR_Start(0, SetCurrentTest[k], CurrentRateN[j], DirectVoltageTest, DirectVoltageRateTest);
					qrr_print = 1;
				}
			
				sleep(1000);

				// Set data
				var IdcSet = dev.r(129).toFixed(2);
				cal_IdcSet.push(IdcSet);

				var fIdcSc = (TEK_Measure(MaxPort) * 1e3).toFixed(2);
				cal_fIdcSc.push(fIdcSc);

				var fIdcSetErr = ((IdcSet - fIdcSc) / fIdcSc * 100).toFixed(2);
				cal_fIdcSetErr.push(fIdcSetErr);

				// Print results
				print("");
				print("fIdcSet,		A: " + IdcSet);
				print("fIdcSc,		A: " + fIdcSc);
				print("fIdcSetErr,	%: " + fIdcSetErr);

				if (anykey()) return 0;
			}
		}		
	}
	return 1;
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Сбор данных для калибровки Id

function CAL_CollectIdCal(IterationsCount)
{
	cal_CntTotal = SetCurrentTest.length * CurrentRateN.length * IterationsCount;
	cal_CntDone = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentRateN.length; j++)
		{
			for (var k = 0; k < SetCurrentTest.length; k++)
			{	

				TEK_Send("horizontal:scale "  + ((SetCurrentTest[k] / CurrentRate[j]) * 1e-6) * 0.7);
				CAL_TekScale(cal_chMeasureI, SetCurrentTest[k] * cal_Rshunt / 1e6 * 2);
				sleep(1000);

				if((SetCurrentTest[k] / CurrentRate[j]) >= 500)
				{	
					print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
					break;
				}		
				else
				{
					qrr_print = 0;
					print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
					QRR_Start(0, SetCurrentTest[k], CurrentRateN[j], DirectVoltageTest, DirectVoltageRateTest);
					qrr_print = 1;
				}
			
				sleep(1000);

				// Set data
				var IdcSetCal = (dev.r(129) / UnitDCUEn).toFixed(2);
				cal_IdcSetCal.push(IdcSetCal);

				var IdcScCal = ((TEK_Measure(MaxPort) * 1e3) / UnitDCUEn).toFixed(2);
				cal_IdcScCal.push(IdcScCal);

				var IdcSetErrCal = ((IdcSetCal - IdcScCal) / IdcScCal * 100).toFixed(2);
				cal_IdcSetErrCal.push(IdcSetErrCal);

				// Print results
				print("");
				print("IdcSet,		A: " + IdcSetCal);
				print("IdcSc,		A: " + IdcScCal);
				print("IdcSetErr,	%: " + IdcSetErrCal);

				if (anykey()) return 0;
			}
		}		
	}
	return 1;
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Сбор данных для калибровки fId

function CAL_CollectfIdCal(IterationsCount)
{
	cal_CntTotal = SetCurrentTest.length * CurrentRateN.length * IterationsCount;
	cal_CntDone = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentRateN.length; j++)
		{
			for (var k = 0; k < SetCurrentTest.length; k++)
			{	

				TEK_TriggerInit(cal_chMeasureI, SetCurrentTest[k] * cal_Rshunt / 1e6 * 0.7);
				CAL_TekScale(cal_chMeasureI, SetCurrentTest[k] * cal_Rshunt / 1e6 * 1.2);
				sleep(1000);

				if((SetCurrentTest[k] / CurrentRate[j]) >= 500)
				{	
					print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
					break;
				}		
				else
				{
					qrr_print = 0;
					print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
					QRR_Start(0, SetCurrentTest[k], CurrentRateN[j], DirectVoltageTest, DirectVoltageRateTest);
					qrr_print = 1;
				}
			
				sleep(1000);

				// Set data
				var IdcSetCal = (dev.r(129) / UnitDCUEn).toFixed(2);
				cal_IdcSetCal.push(IdcSetCal);

				var fIdcScCal = ((TEK_Measure(MaxPort) * 1e3) / UnitDCUEn).toFixed(2);
				cal_fIdcScCal.push(fIdcScCal);

				var fIdcSetErrCal = ((IdcSetCal - fIdcScCal) / fIdcScCal * 100).toFixed(2);
				cal_fIdcSetErrCal.push(fIdcSetErrCal);

				// Print results
				print("");
				print("fIdcSet,		A: " + IdcSetCal);
				print("fIdcSc,		A: " + fIdcScCal);
				print("fIdcSetErr,	%: " + fIdcSetErrCal);

				if (anykey()) return 0;
			}
		}		
	}
	return 1;
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Сбор данных для калибровки Ir

function CAL_CollectIrCal(IterationsCount)
{
	cal_CntTotal = SetCurrentTest.length * CurrentRateN.length * IterationsCount;
	cal_CntDone = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentRateN.length; j++)
		{
			for (var k = 0; k < SetCurrentTest.length; k++)
			{	

				TEK_Send("horizontal:scale "  + ((SetCurrentTest[k] / CurrentRate[j]) * 1e-6) * 0.7);
				CAL_TekScale(cal_chMeasureI, SetCurrentTest[k] * cal_Rshunt / 1e6 * 2);
				sleep(1000);

				if((SetCurrentTest[k] / CurrentRate[j]) >= 500)
				{	
					print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
					break;
				}		
				else
				{
					qrr_print = 0;
					print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
					QRR_Start(0, SetCurrentTest[k], CurrentRateN[j], DirectVoltageTest, DirectVoltageRateTest);
					qrr_print = 1;
				}
			
				sleep(1000);

				// Set data
				var IrcSetCal = (dev.r(129) / UnitRCUEn).toFixed(2);
				cal_IrcSetCal.push(IrcSetCal);

				var IrcScCal = (-(TEK_Measure(MinPort) * 1e3) / UnitRCUEn).toFixed(2);
				cal_IrcScCal.push(IrcScCal);

				var IrcSetErrCal = ((IrcSetCal - IrcScCal) / IrcScCal * 100).toFixed(2);
				cal_IrcSetErrCal.push(IrcSetErrCal);

				// Print results
				print("");
				print("IrcSet,		A: " + IrcSetCal);
				print("IrcSc,		A: " + IrcScCal);
				print("IrcSetErr,	%: " + IrcSetErrCal);

				if (anykey()) return 0;
			}
		}		
	}
	return 1;
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Сбор данных для калибровки dI/dt

function CAL_CollectdIdtCal(IterationsCount)
{
	cal_CntTotal = SetCurrentTest.length * CurrentRateN.length * IterationsCount;
	cal_CntDone = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentRateN.length; j++)
		{
			for (var k = 0; k < SetCurrentTest.length; k++)
			{	

				TEK_Send("horizontal:scale "  + ((SetCurrentTest[k] / CurrentRate[j]) * 1e-6) * 0.8);
				CAL_TekScale(cal_chMeasureI, SetCurrentTest[k] * cal_Rshunt / 1e6 * 2);
				sleep(1000);

				if((SetCurrentTest[k] / CurrentRate[j]) >= 500)
				{	
					print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
					break;
				}		
				else
				{
					qrr_print = 0;
					print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
					QRR_Start(0, SetCurrentTest[k], CurrentRateN[j], DirectVoltageTest, DirectVoltageRateTest);
					qrr_print = 1;
				}
			
				sleep(1000);

				// Set data

				var IdcSet = (dev.r(129) / UnitDCUEn).toFixed(2);
				cal_IdcSet.push(IdcSet);

				var dIdtSetCal = CurrentRate[j];
				cal_dIdtSetCal.push(dIdtSetCal);

				var ScopeData = CAL_MeasureCurrent(cal_chMeasureI);
				var dIdtScCal = parseFloat(ScopeData[2]).toFixed(2);
				cal_dIdtScCal.push(dIdtScCal);

				var dIdtSetErrCal = (((dIdtSetCal - dIdtScCal) / dIdtScCal * 100) / 2).toFixed(2);
				cal_dIdtSetErrCal.push(dIdtSetErrCal);

				// Print results
				print("");
				print("dIdtSet,	A/us: " + dIdtSetCal);
				print("dIdtSc,		A/us: " + dIdtScCal);
				print("dIdtSetErr,	%: " + dIdtSetErrCal);

				if (anykey()) return 0;
			}
		}		
	}
	return 1;
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Сбор данных для Tq

function CAL_CollectTq(IterationsCount)
{
	cal_CntTotal = CurrentRateN.length * IterationsCount;
	cal_CntDone = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentRateN.length; j++)
		{
			print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
			//
			
			do
			{
				qrr_print = 0;			
				QRR_Start(1, DirectCurrentTest, CurrentRateN[j], DirectVoltageTest, DirectVoltageRateTest)
				qrr_print = 1;
				
				print("Is cursor set (y - yes, n -no, s - Stop process)?");
				
				var key = "";
				while(key != "y" && key != "n" && key != "s")
				{
					key = readkey();
					sleep(100);
				}
				
				if(key == "s")
					return 0;
			}
			while(key != "y")
			
			// Unit data
			var Tq = dev.r(213) / 10;			
			cal_Tq.push(Tq);
			print("Tq, us	 : " + Tq);

			// Scope data
			var TqSc = CAL_MeasureTq(cal_chMeasureI);
			cal_TqSc.push(TqSc);
			print("TqTek, us : " + TqSc);
			
			// Relative error
			var TqErr = ((Tq - TqSc) / TqSc * 100).toFixed(2);
			cal_TqErr.push(TqErr);
			print("TqErr, %  : " + TqErr);
			
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Сбор данных для Irr, Trr и Qrr

function CAL_CollectQrr(IterationsCount)
{
	cal_CntTotal = SetCurrentTest.length * CurrentRateN.length * IterationsCount;
	cal_CntDone = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentRateN.length; j++)
		{
			for (var k = 0; k < SetCurrentTest.length; k++)
			{
				sleep(1000);
				while(dev.r(192) == 5 || QSU_ReadReg(160, 192) == 5 || QSU_ReadReg(161, 192) == 5 || QSU_ReadReg(162, 192) == 5 
					|| QSU_ReadReg(170, 192) == 5 || QSU_ReadReg(171, 192) == 5 || QSU_ReadReg(172, 192) == 5) sleep(500);

				print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
				qrr_single = 1;
				QRR_Start(0, SetCurrentTest[k], CurrentRateN[j], DirectVoltageTest, DirectVoltageRateTest);
				qrr_single = 0;
				sleep(2000);
				while(dev.r(192) == 5) sleep(500);
				if(dev.r(198) == 1)
				{	
					var IrrScale = dev.r(211) / 8 / cal_Rshunt;
					var TimeScale = dev.r(212) / 10 * 2 / 10 * 1e-6;

					TEK_Horizontal(TimeScale, "0");
					TEK_HorizontalPosition(5);
					CAL_TekScale(cal_chMeasureI, IrrScale); 
					sleep(2000);
					QRR_Start(0, SetCurrentTest[k], CurrentRateN[j], DirectVoltageTest, DirectVoltageRateTest);
				}	

				sleep(1000);

				// Unit data
				if(dev.r(196) == 0)
				{	
					var Qrr = Qrr = (dev.r(219) << 16 | dev.r(216)) / 10;
					if(QrrGOST)
						var Qrr = (dev.r(218) << 16 | dev.r(210)) / 100;				
					cal_Qrr.push(Qrr);
			
					var Irr = dev.r(211) / 10;
					cal_Irr.push(Irr);
			
					var Trr = dev.r(212) / 10;
					cal_Trr.push(Trr);

					// Scope data
					var ScopeData = CAL_MeasureQrr(cal_chMeasureI);
					var IrrSc = parseFloat(ScopeData[0]).toFixed(2);
					var TrrSc = parseFloat(ScopeData[1]).toFixed(2);
					var QrrSc = parseFloat(ScopeData[2]).toFixed(2);
					if(QrrGOST)
						QrrSc = parseFloat(ScopeData[3]).toFixed(2);			
					cal_IrrSc.push(IrrSc);
					cal_TrrSc.push(TrrSc);
					cal_QrrSc.push(QrrSc);
			
					// Relative error
					var IrrErr = ((Irr - IrrSc) / IrrSc * 100).toFixed(2);
					var TrrErr = ((Trr - TrrSc) / TrrSc * 100).toFixed(2);
					var QrrErr = ((Qrr - QrrSc) / QrrSc * 100).toFixed(2);
		
					cal_IrrErr.push(IrrErr);
					cal_TrrErr.push(TrrErr);
					cal_QrrErr.push(QrrErr);
			
					ChannelDataPlot(cal_chMeasureI, SetCurrentTest[k] + "A " + CurrentRate[j] + " A/us");

					// Print results
					print(SetCurrentTest[k] + " A" + " , " + CurrentRate[j] + "A/us ")
					print("");
					print("Irr, A	 : " + Irr);
					print("IrrTek,  A: " + IrrSc);
					print("IrrErr,  %: " + IrrErr);
					print("");
					print("Trr, us	 : " + Trr);
					print("TrrTek, us: " + TrrSc);
					print("TrrErr,  %: " + TrrErr);
					print("");
					print("Qrr, uQ	 : " + Qrr);
					print("QrrTek, uQ: " + QrrSc);
					print("QrrErr,  %: " + QrrErr);
					print("--------------------");
				}	
			// if (anykey()) return 0;	
			}				
		}
	}

	return 1;
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Сбор данных для dV/dt 

function CAL_CollectdVdt(IterationsCount)
{
	CdVdt_ResetA();

	print("      dV/dt, V/us      |       Voltage, V      ");
	print("  set  |  osc  |  err  |  set  |  osc  |  err  ");
	print("-----------------------------------------------");

	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < SetVoltageRate.length; j++)
		{
			for (var k = 0; k < SetVoltage.length; k++)
			{
				CdVdt_TekVScale(cal_chMeasureU, SetVoltage[k]);
				CdVdt_TekHScale(cal_chMeasureU, SetVoltage[k], SetVoltageRate[j]);
				TEK_TriggerInit(cal_chMeasureU, SetVoltage[k] / 2);
				CdVdt_ClearDisplay();
				TEK_Busy();
				qrr_single = 1;
				QRR_Start(1, DirectCurrentTest, DirectCurrentRateTest, SetVoltage[k], SetVoltageRate[j]);
				qrr_single = 0;
				sleep(3000);
				TEK_Busy();
				var v = CdVdt_MeasureVfast();
				TEK_Busy();
				var rate = SiC_CALC_dVdt(SiC_GD_GetChannelCurve(cal_chMeasureU),10,90).toFixed(1);
				TEK_Busy();
				dVdt_err = (rate - SetVoltageRate[j]) / SetVoltageRate[j] * 100;
				dVdt_err = Math.abs(dVdt_err) < 0.1 ? parseFloat(0).toFixed(1) : dVdt_err.toFixed(1);
				V_err = (v - SetVoltage[k]) / SetVoltage[k] * 100;
				V_err = Math.abs(V_err) < 0.1 ? parseFloat(0).toFixed(1) : V_err.toFixed(1);

				var ETosc = 0;

				cdvdt_rate_set.push(SetVoltageRate[j]);
				cdvdt_v_set.push(SetVoltage[k]);

				cdvdt_rate_sc.push(rate);
				cdvdt_v_sc.push(v);

				cdvdt_rate_err.push(dVdt_err);
				cdvdt_v_err.push(V_err);

				// Summary error
				E0dvdt = 1.1 * Math.sqrt(Math.pow(EUosc, 2) + Math.pow(ETosc, 2) + Math.pow(EProbe, 2));
				dVdt_err_sum = (CdVdt_sign(dVdt_err)*(Math.abs(dVdt_err) + E0dvdt)).toFixed(1)
				cdvdt_rate_err_sum.push(dVdt_err_sum);

				E0V = 1.1 * Math.sqrt(Math.pow(EUosc, 2) + Math.pow(EProbe, 2));
				V_err_sum = (CdVdt_sign(V_err)*(Math.abs(V_err) + E0V)).toFixed(1)
				cdvdt_v_err_sum.push(V_err_sum);

				print("  " + SetVoltageRate[j] + (SetVoltageRate[j] < 100 ? " " : "") + (SetVoltageRate[j] < 1000 ? " " : "") + " | " + rate + (rate < 100 ? " " : "") + (rate < 1000 ? " " : "") + "| " + (dVdt_err >= 0 ? " " : "") + dVdt_err + (Math.abs(dVdt_err) < 10 ? " " : "") + " |  " + SetVoltage[k] + (SetVoltage[k] < 100 ? " " : "") + (SetVoltage[k] < 1000 ? " " : "") + " | " + v + (v < 100 ? " " : "") + (v < 1000 ? " " : "") + "  | " + (V_err >= 0 ? " " : "") + V_err);

				if (def_UseSaveImage)
				{
					var NameFile = "" + SetVoltage[k] + SetVoltageRate[j] + "";
					var SaveImage = "save:image \"A:\\" + NameFile + ".BMP\"";
					TEK_Send(SaveImage);
					sleep(3000);
					TEK_Busy();
				}
				// if (anykey()){ print("Stopped from user!"); return};
			}

		}	
	}

	return 1;		
}
//-------------------------------------------------------------------------------------------------------------------------------------------
// Устаревшая функция
// Сбор данных по напряжению источника формирователя блоков DCU/RCU 

function QRR_TestPSVoltage()
{
	cdvdt_scatter = [];
	for (var i = 1; i <= 4; i++)
	{
		TEK_ChannelOff(i);
	}
	TEK_ChannelOn(cal_chMeasureI);
	//---------------
	TEK_Send("measurement:meas" + cal_chMeasureI + ":source ch" + cal_chMeasureI);
	TEK_Send("measurement:meas" + cal_chMeasureI + ":type pk2pk");
	TEK_Send("measurement:meas1:source ch" + cal_chMeasureI);
	TEK_Send("measurement:meas1:type pk2pk");	
	TEK_Send("measurement:meas2:source ch" + cal_chMeasureI);
	TEK_Send("measurement:meas2:type fall");
	//--------------
	TEK_Horizontal("1e-6", "0");
		
	cal_CntTotalRate = (CurrentRateFinishTestIndex - CurrentRateStartTestIndex + 1);
	cal_CntTotalSet = (CurrentSetFinishTestIndex - CurrentSetStartTestIndex + 1);
	cal_CntTotal = cal_CntTotalRate * cal_CntTotalSet;
	cal_CntDone = 1;
	
	for (var i = CurrentSetStartTestIndex; i <= CurrentSetFinishTestIndex; i++)
	{	
		TEK_ChannelInit(cal_chMeasureI, "1", ((SetCurrentTest[i] * cal_Rshunt * 1e-6) * 2) / 6);
		TEK_Send("ch" + cal_chMeasureI + ":position 0");
		
		TEK_TriggerInit(cal_chMeasureI, (SetCurrentTest[i] * cal_Rshunt * 1e-6) * 2);
		TEK_Send("trigger:main:edge:slope fall");
		
		for (var j = CurrentRateStartTestIndex; j <= CurrentRateFinishTestIndex; j++)
		{
			CAL_QRRHorizontalScale(SetCurrentTest[i], CurrentRate[j]);
			print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
			sleep(3000);
			
			QRR_Start(0, SetCurrentTest[i], CurrentRateN[j], 100, 10);
		
			print("Set current, A : " + SetCurrentTest[i]);
			print("Set current rate, A/us : " + CurrentRate[j]);
			print("INT_PS_VOLTAGE DCU, V : " + QSU_ReadReg(160,201) / 10);
			print("INT_PS_VOLTAGE RCU, V : " + QSU_ReadReg(170,201) / 10);
			
			//CAL_QRRdidt(SetCurrentTest[i], CurrentRateTest[j]);
			
			CAL_MeasureIrate(CurrentRateN[j], SetCurrentTest[i]);
			
			if (anykey()) return 0;
			sleep(500);
		}
	}
	save("data/didt_404.csv", cdidt_scatter);	
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Устаревшая функция
// Выставление горизонтальной развертки

function CAL_QRRHorizontalScale(Current,CurrentRate)
{
	TEK_Horizontal(CAL_QRRTimeScale(Current,CurrentRate), (Current / 2) / CurrentRate * 1e-6);
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Устаревшая функция
// Расчет значения горизонтальной развертки

function CAL_QRRTimeScale(Current,CurrentRate)
{
	OSC_K = 2;
	OSC_TimeScale = ((Current * 2 / CurrentRate) / 10) * 1e-6;
	return OSC_TimeScale * OSC_K
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Устаревшая функция
// Расчет погрешности Id и dI/dt

function CAL_MeasureIrate(RateSet, CurrentSet)
{
	var RateScope = (TEK_Measure(cal_chMeasureI) * 0.8 / cal_Rshunt * 1e6 / TEK_Exec("measurement:meas2:value?") * 1e-6).toFixed(3);	
	var RateErr = ((RateScope - RateSet) / RateSet * 100).toFixed(3);
	
	var CurrentScope = ((TEK_Measure(cal_chMeasureI) / 2) / (cal_Rshunt * 1e-6)).toFixed(3);
	var CurrentErr = ((CurrentScope - CurrentSet) / CurrentSet * 100).toFixed(3);
	
	cdidt_scatter.push(RateSet + ";" + RateScope + ";" + RateErr + ";" + CurrentSet + ";" + CurrentScope + ";" + CurrentErr);
	
	print("current osc, A = " + CurrentScope);	
	print("current error, % = " + CurrentErr);
	
	print("didt osc, A/us = " + RateScope);	
	print("didt error, % = " + RateErr);	
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Устаревшая функция
// Нахождение dI/dt по курсорам

function CAL_QRRdidt(Current,CurrentRate)
{
	var ctou_tgd_u = 0;
	var ctou_tgd_u90 = 0;
	var ctou_tgd_u10 = 0;
	var ctou_tgd_u_err = 0;
	var ctou_tgd_u_preverr = 0;	

	var ctou_tgd_integral = 0;
	var ctou_tgd_derivative = 0;

	var ctou_tgd_kp = 1e-4;
	var ctou_tgd_ki = 9e-4;
	var ctou_tgd_kd = 1e-4;
	
	var cursor_place = -1.4 * (Current / 2) / CurrentRate * 1e-6;
	TEK_Send("cursor:vbars:position1 " + cursor_place);
	TEK_Send("cursor:vbars:position2 " + cursor_place);
	
	ctou_tgd_u = Current * cal_Rshunt * 1e-6;
	ctou_tgd_u90 = (Current * cal_Rshunt * 1e-6) * 0.9;
	ctou_tgd_u10 = -(Current * cal_Rshunt * 1e-6) * 0.9;
	
	ctou_tgd_u.toFixed(1);
	ctou_tgd_u90.toFixed(1);
	ctou_tgd_u10.toFixed(1);
	
	while(ctou_tgd_u > ctou_tgd_u90)
	{
		// ПИД регулятор
		ctou_tgd_u_err = ctou_tgd_u - ctou_tgd_u90;

		ctou_tgd_integral = ctou_tgd_integral + ctou_tgd_u_err * ctou_tgd_ki;

		ctou_tgd_derivative = ctou_tgd_u_err - ctou_tgd_u_preverr;

		ctou_tgd_u_preverr = ctou_tgd_u_err;

		cursor_place_fixed = (ctou_tgd_u_err * ctou_tgd_kp + ctou_tgd_integral * ctou_tgd_ki + ctou_tgd_derivative * ctou_tgd_kd) / CurrentRate;
		//-----------------

		//Если cursor_place_fixed будет выдавать значения менее 10нс, то принудительно сделать шаг 10нс. Иначе при очень маленькой ошибке курсор замирает на долгое время
		if(cursor_place_fixed < 1e-8)
			cursor_place_fixed = 1e-8;

		// Корректировка, отправка нового положения курсора и измерение напряжения в этой точке
		cursor_place = cursor_place_fixed + cursor_place;
		// p("cursor_place " + cursor_place * 1e6);
		TEK_Send("cursor:vbars:position1 " + cursor_place);
		ctou_tgd_u = parseFloat(TEK_Exec("cursor:vbars:hpos1?"));
		ctou_tgd_u.toFixed(1);

		if (anykey()) return 0;
	}
	
	cursor_place = Current / CurrentRate * 1e-6;
	TEK_Send("cursor:vbars:position2 " + cursor_place);
	while(ctou_tgd_u > ctou_tgd_u10)
	{
		// ПИД регулятор
		ctou_tgd_u_err = ctou_tgd_u - ctou_tgd_u10;

		ctou_tgd_integral = ctou_tgd_integral + ctou_tgd_u_err * ctou_tgd_ki;

		ctou_tgd_derivative = ctou_tgd_u_err - ctou_tgd_u_preverr;

		ctou_tgd_u_preverr = ctou_tgd_u_err;

		cursor_place_fixed = (ctou_tgd_u_err * ctou_tgd_kp + ctou_tgd_integral * ctou_tgd_ki + ctou_tgd_derivative * ctou_tgd_kd) / CurrentRate;
		//-----------------

		//Если cursor_place_fixed будет выдавать значения менее 10нс, то принудительно сделать шаг 10нс. Иначе при очень маленькой ошибке курсор замирает на долгое время
		if(cursor_place_fixed < 1e-8)
			cursor_place_fixed = 1e-8;

		// Корректировка, отправка нового положения курсора и измерение напряжения в этой точке
		cursor_place = cursor_place_fixed + cursor_place;
		//p("cursor_place " + cursor_place * 1e6);
		TEK_Send("cursor:vbars:position2 " + cursor_place);
		ctou_tgd_u = parseFloat(TEK_Exec("cursor:vbars:hpos2?"));
		ctou_tgd_u.toFixed(1);

		if (anykey()) return 0;
	}

	var U1 = TEK_Exec("cursor:vbars:hpos1?");
	var U2 = TEK_Exec("cursor:vbars:hpos2?");
	var dT = TEK_Exec("cursor:vbars:delta?");
	
	var didt = ((U1 - U2) / dT) * 1e-3;	
	
	print("didt osc = " + didt.toFixed(2));
	
	print("didt relative error, % = " + ((didt - CurrentRate) / CurrentRate * 100).toFixed(2));
	
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Нахождение Id,Ir и dI/dt по полученным данным из осц.

function CAL_MeasureCurrent(Channel)
{
	var CurrentScale = 0, Current = 0; 
	var TimeFraction;

	CurrentScale = 1 / cal_Rshunt * 1e6;
	Current = SiC_GD_Filter(SiC_GD_GetChannelCurve(Channel), CurrentScale);

	TimeFraction = SiC_GD_GetTimeScale() / 250 * 1e9  / 1000;

	ChannelData("Current016", Channel);


	//Get IdcSc

	ResultIdcSc = TEK_Measure(MaxPort) * 1e3
	

	//Get IrcSc

	ResultIrcSc = TEK_Measure(MinPort) * 1e3

	//Get dIdtSc
	ChannelData("Current016", Channel)
	Use_Data2("Current016", "UseCurrent016", 0.5, 0.5)
	ResultdIdtSc = Use_Time("UseCurrent016")

	var ReturnValues = [];
	ReturnValues[0] = ResultIdcSc;
	ReturnValues[1] = ResultIrcSc;
	ReturnValues[2] = ResultdIdtSc;
	
	return ReturnValues;
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Нахождение Irr,Trr и Qrr по полученным данным из осц.

function CAL_MeasureQrr(Channel)
{
	var CurrentScale = 0, Current = 0, IntegratedCurrent = 0;
	var Index0 = 0, Index09 = 0, Index050 = 0, Index025 = 0, IndexIrr = 0, IndexTrr = 0;
	var k = 0, b = 0, TimeFraction;
	var Result = [];
	var ResultIrr, ResultTrr, ResultQrr, ResultQrrGOST;
	
	// Get waveform
	CurrentScale = 1 / cal_Rshunt * 1e6;
	
	Current = (TEK_GD_Filter(SiC_GD_GetChannelCurve(Channel), CurrentScale));

	TimeFraction = SiC_GD_GetTimeScale() / 250 * 1e9  / 1000;
	
	// Searching zero crossing point
	for(i = 0; i < Current.length; i++)
	{
		if(Current[i] < 0)
		{
			Index0 = i;
			break;
		}
	}
	
	// Searching Irr point
	for(i = Index0; i < Current.length; i++)
	{
		if(Current[i] < Current[IndexIrr])
			IndexIrr = i;
	}
	// Searching Irr * 0.5 point
	// for(i = IndexIrr; i < Current.length; i++)
	// {
		// if(Current[i] > Current[IndexIrr] * 0.5)
		// {
			// Index05 = i;
			// break;
		// }
	// }
	// SiC_Approx2(Current, Index05);
	


	// Searching Irr * 0.9 point
	for(i = IndexIrr; i < Current.length; i++)
	{
		if(Current[i] > Current[IndexIrr] * 0.9)
		{
			Index09 = i;
			break;
		}
	}
	// Searching Irr * 0.25 point
	for(i = IndexIrr; i < Current.length; i++)
	{
		if(Current[i] > Current[IndexIrr] * 0.25)
		{
			Index025 = i;
			break;
		}
	}
	
	// Irr
	ResultIrr =  -Current[IndexIrr];
	
	// Trr calculate
	b = Current[Index09];
	k = (Current[Index025] - Current[Index09]) / (Index025 - Index09);
	IndexTrr = Math.round(-b / k + Index09);
	ResultTrr = ((IndexTrr - Index0) * TimeFraction).toFixed(2);
	
	// Qrr calculate
	for(i = Index0; i < IndexTrr; i++)
		IntegratedCurrent += -Current[i];
	ResultQrr = (IntegratedCurrent * TimeFraction).toFixed(2);
	ResultQrrGOST = (ResultIrr * ResultTrr / 2).toFixed(2);
	
	var ReturnValues = [];
	ReturnValues[0] = ResultIrr;
	ReturnValues[1] = ResultTrr;
	ReturnValues[2] = ResultQrr;
	ReturnValues[3] = ResultQrrGOST;
	
	return ReturnValues;
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Нахождение Tq по полученным данным из осц.

function CAL_MeasureTq(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	sleep(500);
	return TEK_Exec("cursor:vbars:delta?") * 1e6;
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Сброс данных

function CAL_ResetA()
{	
	// Results storage
	cal_Trr = [];
	cal_Irr = [];
	cal_Qrr = [];
	cal_Tq = [];
	//
	cal_IdcSet = []; 
	cal_IrcSet = [];
	cal_dIdtSet = [];
	//
	cal_IdcUnit = [];
	cal_IrcUnit = [];
	cal_dIdtUnit = [];

	// Tektronix data
	cal_TrrSc = [];
	cal_IrrSc = [];
	cal_QrrSc = [];
	cal_TqSc = [];
	//
	cal_IdcSc = [];
	cal_fIdcSc = [];
	cal_IrcSc = [];
	cal_dIdtSc = [];

	// Relative error
	cal_TrrErr = [];
	cal_IrrErr = [];
	cal_QrrErr = [];
	cal_TqErr = [];
	//
	cal_IdcSetErr = [];
	cal_fIdcSetErr = [];
	cal_IrcSetErr = [];
	cal_dIdtSetErr = [];
	//
	cal_IdcUnitErr = [];
	cal_IrcUnitErr = [];
	cal_dIdtUnitErr = [];

	// Calibrate
	cal_IdcSetCal = [];
	cal_IdcScCal = [];
	cal_IdcSetErrCal = [];

	cal_fIdcScCal = [];
	cal_fIdcSetErrCal = [];

	cal_IrcSetCal = [];
	cal_IrcScCal = [];
	cal_IrcSetErrCal = [];

	cal_dIdtSetCal = [];
	cal_dIdtScCal = [];
	cal_dIdtSetErrCal = [];

	// Correction
	Сal_IdSetCorr = [];
	Сal_IHSSCorr = [];
	Сal_fIdSetCorr = [];
	Сal_IrSetCorr = [];
	Сal_dIdtSetCorr = [];

	// Data arrays
	cdidt_scatter = [];
}

//-------------------------------------------------------------------------------------------------------------------------------------------
//Функции сохранения данных

function CAL_SaveIdc(NameIdc)
{
	CGEN_SaveArrays(NameIdc, cal_IdcScCal, cal_IdcSetCal, cal_IdcSetErrCal);
}

//--------------------

function CAL_SavefIdc(NamefIdc)
{
	CGEN_SaveArrays(NamefIdc, cal_fIdcScCal, cal_IdcSetCal, cal_fIdcSetErrCal);
}

//--------------------

function CAL_SaveIdHSS(NameIdHSS)
{
	CGEN_SaveArrays(NameIdHSS, cal_IdcUnit, cal_IdcSet, cal_IdcUnitErr);
}
//--------------------

function CAL_SaveIrc(NameIrc)
{
	CGEN_SaveArrays(NameIrc, cal_IrcScCal , cal_IrcSetCal, cal_IrcSetErrCal);
}

//--------------------

function CAL_SaveIrHSS(NameIrHSS)
{
	CGEN_SaveArrays(NameIrHSS, cal_IrcUnit, cal_IrcSc, cal_IrcUnitErr);
}

//--------------------
function CAL_SavedIdtSet(NamedIdtSet)
{
	CGEN_SaveArrays(NamedIdtSet, cal_IdcSet, cal_dIdtSetErrCal , cal_dIdtScCal);//cal_dIdtSetCal
}

//--------------------
function CAL_SavedIdtHSS(NamedIdtHSS)
{
	CGEN_SaveArrays(NamedIdtHSS, cal_dIdtUnit, cal_dIdtSc, cal_dIdtUnitErr);
}

//--------------------

function CAL_SaveIrr(NameIrr)
{
	CGEN_SaveArrays(NameIrr, cal_Irr, cal_IrrSc, cal_IrrErr);
}

//--------------------

function CAL_SaveTrr(NameTrr)
{
	CGEN_SaveArrays(NameTrr, cal_Trr, cal_TrrSc, cal_TrrErr);
}

//--------------------

function CAL_SaveQrr(NameQrr)
{
	CGEN_SaveArrays(NameQrr, cal_Qrr, cal_QrrSc, cal_QrrErr);
}

//--------------------

function CAL_SaveTq(NameTq)
{
	CGEN_SaveArrays(NameTq, cal_Tq, cal_TqSc, cal_TqErr);
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Функции настройки осц.

function CAL_TekInitCurrent()
{
	TEK_Horizontal("1e-6", "0");

	TEK_ChannelInit(cal_chMeasureI, "1", "0.1");
	TEK_Send("ch" + cal_chMeasureI + ":position 0");

	TEK_TriggerInit(cal_chMeasureI, "0.09");
	TEK_Send("trigger:main:edge:slope fall");

	TEK_Send("data:width 1");
	TEK_Send("data:encdg rpb");
	TEK_Send("data:start 1");
	TEK_Send("data:stop 2500");

}

//--------------------

function CAL_TekInitfIdCal()
{
	TEK_Horizontal("5e-5", "-2e-4");

	TEK_ChannelInit(cal_chMeasureI, "1", "0.1");
	TEK_Send("ch" + cal_chMeasureI + ":position -4");

	TEK_TriggerInit(cal_chMeasureI, "0.09");
	TEK_Send("trigger:main:edge:slope rise");

	TEK_Send("data:width 1");
	TEK_Send("data:encdg rpb");
	TEK_Send("data:start 1");
	TEK_Send("data:stop 2500");

}

//--------------------

function CAL_TekInitQrr()
{
	TEK_Horizontal("1e-4", "4");
	
	TEK_ChannelInit(cal_chMeasureI, "1", "0.1");
	TEK_Send("ch" + cal_chMeasureI + ":position 2");
	
	TEK_ChannelInit(cal_chMeasureU, "100", "20");
	TEK_Send("ch" + cal_chMeasureU + ":position 3");
	
	TEK_TriggerInit(cal_chMeasureI, "-0.05");
	TEK_Send("trigger:main:edge:slope rise");
	
	TEK_AcquireAvg(4);

	TEK_Send("data:width 1");
	TEK_Send("data:encdg rpb");
	TEK_Send("data:start 1");
	TEK_Send("data:stop 2500");
}

//--------------------

function CAL_TekInitTq()
{
	TEK_Horizontal("10e-6", "0");
	
	TEK_ChannelInit(cal_chMeasureI, "1", "0.1");
	TEK_Send("ch" + cal_chMeasureI + ":position 0");
	
	TEK_ChannelInit(cal_chMeasureU, "100", "50");
	TEK_Send("ch" + cal_chMeasureU + ":position -1");
	
	TEK_TriggerInit(cal_chMeasureU, "-50");
	TEK_Send("trigger:main:edge:slope raise");
}

//--------------------

function CAL_TekInitdVdt()
{
	TEK_ChannelOff(cal_chMeasureI);
	TEK_ChannelOn(cal_chMeasureU);

	CdVdt_TekMeasurement(cal_chMeasureU);

	TEK_Horizontal("10e-6", "0");
	
	TEK_ChannelInit(cal_chMeasureU, cdvdt_HVProbeScale, "100");
	TEK_Send("ch" + cal_chMeasureU + ":position -4");
	
	TEK_TriggerInit(cal_chMeasureU, "100");
	TEK_Send("trigger:main:edge:slope raise");

}

//--------------------

function CAL_TekScale(Channel, Value)
{
	Value = Value / 6;
	TEK_Send("ch" + Channel + ":scale " + Value);
}

//--------------------

function CAL_HorizontalScale(CurrentRateN)
{
	switch(CurrentRateN)
	{
		case 0:
			TEK_Horizontal("100e-6", "0");
			
			break;
		case 1:
			TEK_Horizontal("50e-6", "0.2e-3");
			
			break;
		case 2:
			TEK_Horizontal("50e-6", "0.2e-3");
			
			break;
		case 3:
			TEK_Horizontal("50e-6", "0.2e-3");
			
			break;
		case 4:
			TEK_Horizontal("25e-6", "0.1e-3");
			
			break;
		case 5:
			TEK_Horizontal("10e-6", "3e-5");
			
			break;
		case 6:
			TEK_Horizontal("10e-6", "3e-5");
			
			break;
		case 7:
			TEK_Horizontal("10e-6", "1.5e-5");
			
			break;
		case 8:
			TEK_Horizontal("10e-6", "1.5e-5");
			
			break;
		case 9:
			TEK_Horizontal("8e-6", "5.5e-6");
			
			break;
		case 10:
			TEK_Horizontal("5e-6", "6.5e-6");

			break;
	}
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Функция сброса корректировок IdSet

function CAL_ResetIdSetCal()
{
	CAL_SetCoefIdSet(0, 1, 0);
}

//--------------------
// Функция сброса корректировок IHSS

function CAL_ResetIHSSCal()
{
	CAL_SetCoefIHSS(1, 0);
}

//--------------------
// Функция сброса корректировок fIdSet

function CAL_ResetfIdSetCal()
{
	CAL_SetCoeffIdSet(1, 0);
}

//--------------------
// Функция сброса корректировок IrSet

function CAL_ResetIrSetCal()
{
	CAL_SetCoefIrSet(1, 0);
}

//--------------------
// Функция сброса корректировок dIdtSet

function CAL_ResetdIdtSetCal()
{
	CAL_SetCoefdIdtSet(0, 0, 0);
}

//--------------------

//-------------------------------------------------------------------------------------------------------------------------------------------
// Функция записи корректировок IdSet

function CAL_SetCoefIdSet(P2, P1, P0)
{
	dev.ws(79, Math.round(P2 * 1e6));
	dev.w(78, Math.round(P1 * 1000));
	dev.ws(77, Math.round(P0));	
}

//--------------------
// Функция записи корректировок IHSS

function CAL_SetCoefIHSS(P1, P0)
{
	QSUWriteRegS(0, 2, Math.round(P1 * 1000));
	QSUWriteRegS(0, 4, Math.round(P0));	
}

//--------------------
// Функция записи корректировок fIdSet

function CAL_SetCoeffIdSet(P1, P0)
{
	dev.w(74, Math.round(P1 * 1000));
	dev.ws(73, Math.round(P0));	
}

//--------------------
// Функция записи корректировок IrSet

function CAL_SetCoefIrSet(P1, P0)
{
	dev.w(76, Math.round(P1 * 1000));
	dev.ws(75, Math.round(P0));	
}

//--------------------
// Функция записи корректировок dIdtSet

function CAL_SetCoefdIdtSet(P2, P1, P0)
{
	dev.ws(72, Math.round(P2 * 1e6));
	dev.w(71, Math.round(P1 * 1000));
	dev.ws(70, Math.round(P0));	
}

//--------------------

//-------------------------------------------------------------------------------------------------------------------------------------------
// Функция вызова значений регистров для IdSet

function CAL_PrintCoefIdSet()
{
	print("IdSet P2 x1e6	: " + dev.rs(79));
	print("IdSet P1 x1000	: " + dev.rs(78));
	print("IdSet P0 		: " + dev.rs(77));
}

//--------------------
// Функция вызова значений регистров для IHSS

function CAL_PrintCoefIHSS()
{
	print("IHSS N x1000	: " + QSU_ReadReg(0,2));
	print("IHSS OFFSET 	: " + QSU_ReadReg(0,4));
}

//--------------------
// Функция вызова значений регистров для fIdSet

function CAL_PrintCoeffIdSet()
{
	print("fIdSet P1 x1000	: " + dev.rs(74));
	print("fIdSet P0 		: " + dev.rs(73));
}

//--------------------
// Функция вызова значений регистров для Irset

function CAL_PrintCoefIrSet()
{
	print("IrSet K x1000	: " + dev.rs(76));
	print("IrSet OFFSET 	: " + dev.rs(75));
}

//--------------------
// Функция вызова значений регистров для dI/dtSet

function CAL_PrintCoefdIdtSet()
{
	print("dIdtSet P2 x1e6	: " + dev.rs(72));
	print("dIdtSet P1 x1000	: " + dev.rs(71));
	print("dIdtSet P0 		: " + dev.rs(70));
}

//--------------------
