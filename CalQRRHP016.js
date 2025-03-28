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
MaxPort = 1;
MinPort = 2;
//
def_UseSaveImage = true; 
//
SetCurrentTest = [320, 1000, 2000, 3200]; // in A  320, 500, 1000, 1500, 2000, 2500, 3000, 3200
CurrentRateN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
CurrentRate = [1, 1.5, 2, 5, 10, 15, 20, 30, 50, 60, 100]; // in А/us  1, 1.5, 2, 5, 10, 15, 20, 30, 50, 60, 100
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
cal_IrcSc = [];
cal_dIdtSc = [];

// Relative error
cal_TrrErr = [];
cal_IrrErr = [];
cal_QrrErr = [];
cal_TqErr = [];
//
cal_IdcSetErr = [];
cal_IrcSetErr = [];
cal_dIdtSetErr = [];
//
cal_IdcUnitErr = [];
cal_IrcUnitErr = [];
cal_dIdtUnitErr = [];

// Data arrays
cdidt_scatter = [];

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
}
//--------------------
function CAL_VerifyCurrent()
{
	CAL_ResetA();

	dev.w(153,1);
	dev.c(110);

	// Tektronix init
	CAL_TekInitCurrent();

	if (CAL_CollectCurrent(cal_Iterations))
	{
		CAL_SaveIdc("QSU_Idc");
		CAL_SaveIrc("QSU_Irc");
		CAL_SavedIdt("QSU_dIdt");


		// Plot relative error distribution
		scattern(cal_IdcSc, cal_IdcSetErr, "Current Direct (in A)", "Error (in %)", "Current Direct Set error");
		scattern(cal_IrcSc, cal_IrcSetErr, "Current Revers (in A)", "Error (in %)", "Current Revers Set error");
		scattern(cal_IdcSc, cal_IdcUnitErr, "Current Direct (in A)", "Error (in %)", "Current Direct Measure error");
		scattern(cal_IrcSc, cal_IrcUnitErr, "Current Revers (in A)", "Error (in %)", "Current Revers Measure error");
		scattern(cal_dIdtSc, cal_dIdtSetErr, "dIdt (in A/us)", "Error (in %)", "dIdt Set error");
		scattern(cal_dIdtSc, cal_dIdtUnitErr, "dIdt (in A/us)", "Error (in %)", "dIdt Measure error");
	}	

	//dev.w(153,0);
	dev.c(111);
}
//--------------------

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
//--------------------

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
//--------------------

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
				TEK_Send("horizontal:scale "  + ((SetCurrentTest[k] / CurrentRate[j]) * 1e-6) * 0.4);
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

				var dIdtSet = CurrentRate[dev.r(132)];
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
				print("dIdtUnitErr,	%: " + dIdtUnitErr)
				print("--------------------");
			
				if (anykey()) return 0;
			}
		}
	}
	return 1;
}

//--------------------

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
//--------------------

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
//--------------------

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
//--------------------

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

function CAL_QRRHorizontalScale(Current,CurrentRate)
{
	TEK_Horizontal(CAL_QRRTimeScale(Current,CurrentRate), (Current / 2) / CurrentRate * 1e-6);
}

function CAL_QRRTimeScale(Current,CurrentRate)
{
	OSC_K = 2;
	OSC_TimeScale = ((Current * 2 / CurrentRate) / 10) * 1e-6;
	return OSC_TimeScale * OSC_K
}

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
//--------------------

function CAL_MeasureTq(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	sleep(500);
	return TEK_Exec("cursor:vbars:delta?") * 1e6;
}
//--------------------

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
	cal_IrcSc = [];
	cal_dIdtSc = [];

	// Relative error
	cal_TrrErr = [];
	cal_IrrErr = [];
	cal_QrrErr = [];
	cal_TqErr = [];
	//
	cal_IdcSetErr = [];
	cal_IrcSetErr = [];
	cal_dIdtSetErr = [];
	//
	cal_IdcUnitErr = [];
	cal_IrcUnitErr = [];
	cal_dIdtUnitErr = [];

	// Data arrays
	cdidt_scatter = [];
}
//--------------------


function CAL_SaveIdc(NameIdc)
{
	CGEN_SaveArrays(NameIdc, cal_IdcSet, cal_IdcUnit, cal_IdcSc, cal_IdcSetErr, cal_IdcUnitErr);
}
//--------------------
function CAL_SaveIrc(NameIrc)
{
	CGEN_SaveArrays(NameIrc, cal_IrcSet, cal_IrcUnit, cal_IrcSc, cal_IrcSetErr, cal_IrcUnitErr);
}
//--------------------
function CAL_SavedIdt(NamedIdt)
{
	CGEN_SaveArrays(NamedIdt, cal_dIdtSet, cal_dIdtUnit, cal_dIdtSc, cal_dIdtSetErr, cal_dIdtUnitErr);
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

//--------------------

function CAL_TekInitCurrent()
{
	TEK_Horizontal("1e-6", "0");

	TEK_ChannelInvInit(cal_chMeasureI, "1", "0.1");
	TEK_Send("ch" + cal_chMeasureI + ":position 0");

	TEK_TriggerInit(cal_chMeasureI, "-0.09");
	TEK_Send("trigger:main:edge:slope rise");

	TEK_Send("data:width 1");
	TEK_Send("data:encdg rpb");
	TEK_Send("data:start 1");
	TEK_Send("data:stop 2500");

}
//--------------------

function CAL_TekInitQrr()
{
	TEK_Horizontal("1e-4", "0");
	
	TEK_ChannelInvInit(cal_chMeasureI, "1", "0.1");
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
	
	TEK_ChannelInvInit(cal_chMeasureI, "1", "0.1");
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
//--------------------