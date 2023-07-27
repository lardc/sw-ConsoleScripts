include("TestDRCU.js")
include("Tektronix.js")
include("CalGeneral.js")
include("TestQRR.js")

// Calibration setup parameters
cal_Rshunt = 1000;	// uOhm
cal_Points = 10;
//
cal_IdMin = 100;	
cal_IdMax = 400;
cal_IdStp = 0;

cal_IntPsVmin = 90;	// V
cal_IntPsVmax = 125;

CurrentRateTest = [0.5, 0.75, 1, 2.5, 5, 7.5, 10, 15, 25, 30, 50]; // in A/us

cal_Iterations = 1;
cal_UseAvg = 1;
cal_UseCursors = 1;
cal_UseQRR = 1;
cal_QRRCanPort = 9;
cal_QRRCanNID = 10;
cal_CoolSwitch = 0;
DRCU_Active = 01; // RCU/DCU active (calibrated)
DRCU_Present = 10; // RCU/DCU present (need to be charged), only non-active
//		

// Counters
cal_CntTotal = 0;
cal_CntDone = 0;

// Channels
cal_chMeasureId = 1;
cal_chSync = 3;

// Results storage
cal_Idset = [];
cal_Irate = [];
cal_VintPS = [];

// Tektronix data
cal_IdSc = [];
cal_IrateSc = [];

// Relative error
cal_IdsetErr = [];
cal_IrateErr = [];

// Correction
cal_IdsetCorr = [];
cal_IrateCorr = [];

// Data arrays
crcu_scatter = [];

function CAL_Init(portDevice, portTek, channelMeasureId)
{
	if (cal_UseQRR == 1)
	{
		QRR_CANCal(cal_QRRCanPort,cal_QRRCanNID,DRCU_Active, DRCU_Present);
		dev.Disconnect();
	}
	if (channelMeasureId < 1 || channelMeasureId > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	cal_chMeasureId = channelMeasureId;

	// Init device port
	dev.Disconnect();
	dev.Connect(portDevice);

	// Init Tektronix port
	TEK_PortInit(portTek);
	
	// Tektronix init
	for (var i = 1; i <= 4; i++)
	{
		if (i == channelMeasureId)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
	cal_IdStp = (cal_IdMax - cal_IdMin ? cal_IdMax - cal_IdMin : 1) / cal_Points;	
}
//--------------------

function CAL_CalibrateId()
{		
	CAL_ResetA();
	CAL_ResetIdsetCal();
	
	// Tektronix init
	CAL_TekInitId();

	// Reload values
	var CurrentArray = CGEN_GetRange(cal_IdMin, cal_IdMax, cal_IdStp);

	if (CAL_CollectId(CurrentArray, cal_Iterations))
	{
		CAL_SaveIdset("RCU_Idset");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdsetErr, "Current (in A)", "Error (in %)", "Current set relative error");

		// Calculate correction		
		cal_IdsetCorr = CGEN_GetCorrection2("RCU_Idset");
		CAL_SetCoefIdset(cal_IdsetCorr[0], cal_IdsetCorr[1], cal_IdsetCorr[2]);
		CAL_PrintCoefIdset();
	}
}
//--------------------

function CAL_CalibrateIrate()
{		
	CAL_ResetA();
	
	// Tektronix init
	CAL_TekInitIrate();
	
	// Reload values
	var CurrentArray = CGEN_GetRange(cal_IdMin, cal_IdMax, cal_IdStp);

	if (CAL_CompensationIrate(CurrentArray))
	{
		CAL_SaveVintPS("RCU_VintPS");

		// Calculate correction
		cal_IrateCorr = CGEN_GetCorrection("RCU_VintPS");
		CAL_SetCoefIrateCompens(cal_IrateCorr[0], cal_IrateCorr[1]);
		CAL_PrintCoefIrateCompens();
	}
}
//--------------------

function CAL_VerifyId()
{		
	CAL_ResetA();
	
	// Tektronix init
	CAL_TekInitId();

	// Reload values
	var CurrentArray = CGEN_GetRange(cal_IdMin, cal_IdMax, cal_IdStp);

	if (CAL_CollectId(CurrentArray, cal_Iterations))
	{
		CAL_SaveIdset("RCU_Idset_fixed");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdsetErr, "Current (in A)", "Error (in %)", "Current set relative error");
	}
}
//--------------------

function CAL_VerifyIrate()
{		
	CAL_ResetA();
	
	// Tektronix init
	CAL_TekInitIrate();

	// Reload values
	var CurrentArray = CGEN_GetRange(cal_IdMin, cal_IdMax, cal_IdStp);
	CAL_CollectIrate(CurrentArray, cal_Iterations);
}
//--------------------

function CAL_CollectId(CurrentValues, IterationsCount)
{
	cal_CntTotal = IterationsCount * CurrentValues.length;
	cal_CntDone = 1;

	var AvgNum;
	if (cal_UseAvg)
	{
		AvgNum = 4;
		TEK_AcquireAvg(AvgNum);
	}
	else
	{
		AvgNum = 1;
		TEK_AcquireSample();
	}
	
	for (var i = 0; i < IterationsCount; i++)
	{
		if (cal_CoolSwitch == 1){
		dev.w(19,0);
		sleep(1000);
		p("Cooling off");
		} 
		else 
		dev.w(19,1);
		for (var j = 0; j < CurrentValues.length; j++)
		{
			print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
			//
			RCU_TekScaleId(cal_chMeasureId, CurrentValues[j] * cal_Rshunt / 1000000);
			CAL_TekSetHorizontalScale(CurrentValues[j]);
			sleep(1000);
			
			for (var k = 0; k < AvgNum; k++)
			{
				if(!DRCU_Pulse(CurrentValues[j], CurrentRateTest * 100))
					return 0;
			}
			
			// Unit data			
			var IdSet = dev.r(128);
			cal_Idset.push(IdSet);
			print("Idset, A: " + IdSet);

			// Scope data
			var IdSc = (CAL_MeasureId(cal_chMeasureId) / cal_Rshunt * 1000000).toFixed(2);
			cal_IdSc.push(IdSc);
			print("Idtek, A: " + IdSc);

			// Relative error			
			var IdsetErr = ((IdSc - IdSet) / IdSc * 100).toFixed(2);
			cal_IdsetErr.push(IdsetErr);
			print("Idseterr, %: " + IdsetErr);
			print("--------------------");
			
			if (anykey()) return 0;
		}
		if (cal_CoolSwitch == 1){
		dev.w(19,1);
		sleep(10000);
		p("Cooling 10 sec");
		}
	}

	return 1;
}
//--------------------

function CAL_CollectIrate(CurrentValues, IterationsCount)
{
	cal_CntTotal = IterationsCount * CurrentValues.length * CurrentRateTest.length;
	cal_CntDone = 1;

	var AvgNum;
	if (cal_UseAvg)
	{
		AvgNum = 4;
		TEK_AcquireAvg(AvgNum);
	}
	else
	{
		AvgNum = 1;
		TEK_AcquireSample();
	}
	
	for (var i = 0; i < IterationsCount; i++)
	{	
		
		for (var k = 0; k < CurrentRateTest.length; k++)
		{	
			cal_IdSc = [];
			cal_IdsetErr = [];
			cal_IrateErr = [];	
			
			for (var j = 0; j < CurrentValues.length; j++)
			{
				print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
				//
				RCU_TekScaleId(cal_chMeasureId, CurrentValues[j] * cal_Rshunt * 1e-6);
				TEK_Send("horizontal:scale "  + ((CurrentValues[j] / CurrentRateTest[k]) * 1e-6) * 0.25);
				TEK_Send("horizontal:main:position "+ ((CurrentValues[j] / CurrentRateTest[k]) * 1e-6) * -0.1);
				sleep(800);
				
				for (var m = 0; m < AvgNum; m++)
				{
					if(!DRCU_Pulse(CurrentValues[j], CurrentRateTest[k] * 100))
						return 0;
				}
				sleep(1300);
				if (cal_CoolSwitch == 1){
				dev.w(19,0);
				sleep(1000);
				p("Cooling off");
				} 
				else 
				dev.w(19,1);
				CAL_MeasureIrate(CurrentRateTest[k],CurrentValues[j]);
				if (cal_CoolSwitch == 1){
				dev.w(19,1);
				sleep(10000);
				p("Cooling 10 sec");
		}
				if (anykey()) return 0;
			}
			scattern(cal_IdSc, cal_IrateErr, "Current (in A)", "Error (in %)", "RCU Current rate relative error " + CurrentRateTest[k] + " A/us");
			scattern(cal_IdSc, cal_IdsetErr, "Current (in A)", "Error (in %)", "RCU Set current relative error " + CurrentRateTest[k] + " A/us");
		}

	}
	save("data/rcu_404.csv", crcu_scatter);
	return 1;
}
//--------------------

function CAL_MeasureIrate(RateSet, CurrentSet)
{
	var RateScope = (TEK_Measure(cal_chMeasureId) * 0.8 / cal_Rshunt * 1e6 / TEK_Exec("measurement:meas2:value?") * 1e-6).toFixed(2);	
	var RateErr = ((RateScope - RateSet) / RateSet * 100).toFixed(2);
	
	var CurrentScope = (TEK_Measure(cal_chMeasureId) / (cal_Rshunt * 1e-6)).toFixed(2);
	var CurrentErr = ((CurrentScope - CurrentSet) / CurrentSet * 100).toFixed(2);
	
	crcu_scatter.push(RateSet + ";" + RateScope + ";" + RateErr + ";" + CurrentSet + ";" + CurrentScope + ";" + CurrentErr);
	
	cal_IdSc.push(CurrentScope);
	cal_IdsetErr.push(CurrentErr);
	cal_IrateErr.push(RateErr);

	print("Current Set, A = " + CurrentSet);	
	print("Current Osc, A = " + CurrentScope);	
	print("Current Err, % = " + CurrentErr);
	
	print("di/dt Set, A/us = " + RateSet);	
	print("di/dt Osc, A/us = " + RateScope);	
	print("di/dt Err, % = " + RateErr);	
}
//--------------------

function CAL_CompensationIrate(CurrentValues)
{	
	var AvgNum, VoltageMin, VoltageMax, Voltage;
	
	if (cal_UseAvg)
	{
		AvgNum = 4;
		TEK_AcquireAvg(AvgNum);
	}		
	else
	{
		AvgNum = 1;
		TEK_AcquireSample();
	}

	
	for (var j = 0; j < CurrentValues.length; j++)
	{	
		VoltageMin = cal_IntPsVmin;
		VoltageMax = cal_IntPsVmax;
	
		RCU_TekScaleId(cal_chMeasureId, CurrentValues[j] * cal_Rshunt / 1000000);
		CAL_TekSetHorizontalScale(CurrentValues[j]);
		sleep(1000);
		
		for (var i = 0; i < cal_Points; i++)
		{		
			Voltage = Math.round((VoltageMin + (VoltageMax - VoltageMin) / 2) * 10) / 10;
			
			dev.w(130, Voltage * 10);
			
			p("Current, A : " + CurrentValues[j]);
			p("VintPS max : " + VoltageMax);
			p("VintPS,  V : " + Voltage);
			p("VintPS min : " + VoltageMin);
			p("-------------");
			
			for (var k = 0; k < AvgNum; k++)
			{
				if(!DRCU_Pulse(CurrentValues[j], CurrentRateTest * 100))
					return 0;
			}
			
			var IrateSc = CAL_MeasureIrate();
			
			if(IrateSc < CurrentRateTest)
				VoltageMin = Voltage;
			else
			{
				if(IrateSc > CurrentRateTest)
					VoltageMax = Voltage;
				else
					break;
			}
			
			if((VoltageMin + 0.2) >= VoltageMax)
				break;
			
			if (anykey()) return 0;
		}

		cal_Idset.push(CurrentValues[j]);
		cal_VintPS.push(Voltage * 10);
	}
	
	dev.w(130, 0);
	
	return 1;
}
//--------------------

function RCU_TekScaleId(Channel, Value)
{
	Value = Value / 7;
	TEK_Send("ch" + Channel + ":scale " + Value);	
	TEK_TriggerInit(cal_chMeasureId, Value * 4);
	TEK_Send("trigger:main:edge:slope rise");
}
//--------------------

function RCU_TriggerInit(Channel, Level)
{
	TEK_Send("trigger:main:level " + Level);
	TEK_Send("trigger:main:mode normal");
	TEK_Send("trigger:main:type edge");
	TEK_Send("trigger:main:edge:coupling dc");
	TEK_Send("trigger:main:edge:slope rise");
	TEK_Send("trigger:main:edge:source ch" + Channel);
}
//--------------------

function CAL_TekInitId()
{
	TEK_ChannelInit(cal_chMeasureId, "1", "0.02");
	TEK_TriggerInit(cal_chMeasureId, "0.06");
	TEK_Send("trigger:main:edge:slope rise");
	TEK_Horizontal("-5e-6", "0");
	
	if(cal_UseCursors)
	{
		TEK_Send("cursor:select:source ch" + cal_chMeasureId);
		TEK_Send("cursor:function vbars");
		TEK_Send("cursor:vbars:position1 -5e-3");
	}
	else
	{
		TEK_Send("measurement:meas" + cal_chMeasureId + ":source ch" + cal_chMeasureId);
		TEK_Send("measurement:meas" + cal_chMeasureId + ":type maximum");
	}
}
//--------------------

function CAL_TekInitIrate()
{
	TEK_ChannelInit(cal_chMeasureId, "1", "0.02");
	TEK_TriggerInit(cal_chMeasureId, "0.1");
	TEK_Send("ch" + cal_chMeasureId + ":position -4");
	TEK_Send("trigger:main:edge:slope rise");
	TEK_Send("measurement:meas" + cal_chMeasureId + ":source ch" + cal_chMeasureId);
	TEK_Send("measurement:meas" + cal_chMeasureId + ":type maximum");
	TEK_Send("measurement:meas1:source ch" + cal_chMeasureId);
	TEK_Send("measurement:meas1:type maximum");
	TEK_Send("measurement:meas2:source ch" + cal_chMeasureId);
	TEK_Send("measurement:meas2:type rise");
}
//--------------------

function CAL_MeasureId(Channel)
{
	if(cal_UseCursors)
		return TEK_Exec("cursor:vbars:hpos2?");
	else
		return TEK_Measure(Channel);
}
//--------------------

function CAL_ResetA()
{	
	// Results storage
	cal_Idset = [];
	cal_Irateset = [];
	cal_VintPS = [];

	// Tektronix data
	cal_IdSc = [];
	cal_IrateSc = [];

	// Relative error
	cal_IdsetErr = [];
	cal_IrateErr = [];

	// Correction
	cal_IdsetCorr = [];
	cal_IrateCorr = [];
	
	// Data arrays
	crcu_scatter = [];
}
//--------------------

function CAL_SaveIdset(NameIdset)
{
	CGEN_SaveArrays(NameIdset, cal_IdSc, cal_Idset, cal_IdsetErr);
}
//--------------------

function CAL_SaveVintPS(NameVintPS)
{	
	var csv_array = [];
	
	for (var i = 0; i < cal_Idset.length; i++)
		csv_array.push(cal_Idset[i] + ";" + cal_VintPS[i]);
	
	save(cgen_correctionDir + "/" + NameVintPS + ".csv", csv_array);
}
//--------------------

function CAL_ResetIdsetCal()
{
	CAL_SetCoefIdset(0, 1, 0);
}
//--------------------

function CAL_SetCoefIrateCompens(K, Offset)
{
	K = parseFloat(K);
	Offset = parseFloat(Offset);
	
	switch(CurrentRateTest * 100)
	{
		case 50:
			dev.ws(41, Offset);
			dev.ws(42, K * 1000);
			break;
		case 75:
			dev.ws(43, Offset);
			dev.ws(44, K * 1000);
			break;
		case 100:
			dev.ws(45, Offset);
			dev.ws(46, K * 1000);
			break;
		case 250:
			dev.ws(47, Offset);
			dev.ws(48, K * 1000);
			break;
		case 500:
			dev.ws(49, Offset);
			dev.ws(50, K * 1000);
			break;
		case 750:
			dev.ws(51, Offset);
			dev.ws(52, K * 1000);
			break;
		case 1000:
			dev.ws(53, Offset);
			dev.ws(54, K * 1000);
			break;
		case 1500:
			dev.ws(55, Offset);
			dev.ws(56, K * 1000);
			break;
		case 2500:
			dev.ws(57, Offset);
			dev.ws(58, K * 1000);
			break;
		case 3000:
			dev.ws(59, Offset);
			dev.ws(60, K * 1000);
			break;
		case 5000:
			dev.ws(61, Offset);
			dev.ws(62, K * 1000);
			break;
	}
}
//--------------------

function CAL_SetCoefIdset(P2, P1, P0)
{
	switch(CurrentRateTest * 100)
	{
		case 50:
			dev.ws(87, Math.round(P2 * 1e6));
			dev.w(88, Math.round(P1 * 1000));
			dev.ws(89, Math.round(P0));	
			break;
		case 75:
			dev.ws(90, Math.round(P2 * 1e6));
			dev.w(91, Math.round(P1 * 1000));
			dev.ws(92, Math.round(P0));	
			break;
		case 100:
			dev.ws(93, Math.round(P2 * 1e6));
			dev.w(94, Math.round(P1 * 1000));
			dev.ws(95, Math.round(P0));	
			break;
		case 250:
			dev.ws(96, Math.round(P2 * 1e6));
			dev.w(97, Math.round(P1 * 1000));
			dev.ws(98, Math.round(P0));	
			break;
		case 500:
			dev.ws(99, Math.round(P2 * 1e6));
			dev.w(100, Math.round(P1 * 1000));
			dev.ws(101, Math.round(P0));	
			break;
		case 750:
			dev.ws(102, Math.round(P2 * 1e6));
			dev.w(103, Math.round(P1 * 1000));
			dev.ws(104, Math.round(P0));	
			break;
		case 1000:
			dev.ws(105, Math.round(P2 * 1e6));
			dev.w(106, Math.round(P1 * 1000));
			dev.ws(107, Math.round(P0));	
			break;
		case 1500:
			dev.ws(108, Math.round(P2 * 1e6));
			dev.w(109, Math.round(P1 * 1000));
			dev.ws(110, Math.round(P0));	
			break;
		case 2500:
			dev.ws(111, Math.round(P2 * 1e6));
			dev.w(112, Math.round(P1 * 1000));
			dev.ws(113, Math.round(P0));	
			break;
		case 3000:
			dev.ws(114, Math.round(P2 * 1e6));
			dev.w(115, Math.round(P1 * 1000));
			dev.ws(116, Math.round(P0));	
			break;
		case 5000:
			dev.ws(117, Math.round(P2 * 1e6));
			dev.w(118, Math.round(P1 * 1000));
			dev.ws(119, Math.round(P0));	
			break;
	}
}
//--------------------

function CAL_PrintCoefIdset()
{
	switch(CurrentRateTest * 100)
	{
		case 50:
			print("Idset P2 x1e6	: " + dev.rs(87));
			print("Idset P1 x1000	: " + dev.rs(88));
			print("Idset P0 		: " + dev.rs(89));
			break;
		case 75:
			print("Idset P2 x1e6	: " + dev.rs(90));
			print("Idset P1 x1000	: " + dev.rs(91));
			print("Idset P0 		: " + dev.rs(92));
			break;
		case 100:
			print("Idset P2 x1e6	: " + dev.rs(93));
			print("Idset P1 x1000	: " + dev.rs(94));
			print("Idset P0 		: " + dev.rs(95));
			break;
		case 250:
			print("Idset P2 x1e6	: " + dev.rs(96));
			print("Idset P1 x1000	: " + dev.rs(97));
			print("Idset P0 		: " + dev.rs(98));
			break;
		case 500:
			print("Idset P2 x1e6	: " + dev.rs(99));
			print("Idset P1 x1000	: " + dev.rs(100));
			print("Idset P0 		: " + dev.rs(101));	
			break;
		case 750:
			print("Idset P2 x1e6	: " + dev.rs(102));
			print("Idset P1 x1000	: " + dev.rs(103));
			print("Idset P0 		: " + dev.rs(104));	
			break;
		case 1000:
			print("Idset P2 x1e6	: " + dev.rs(105));
			print("Idset P1 x1000	: " + dev.rs(106));
			print("Idset P0 		: " + dev.rs(107));	
			break;
		case 1500:
			print("Idset P2 x1e6	: " + dev.rs(108));
			print("Idset P1 x1000	: " + dev.rs(109));
			print("Idset P0 		: " + dev.rs(110));	
			break;
		case 2500:
			print("Idset P2 x1e6	: " + dev.rs(111));
			print("Idset P1 x1000	: " + dev.rs(112));
			print("Idset P0 		: " + dev.rs(113));	
			break;
		case 3000:
			print("Idset P2 x1e6	: " + dev.rs(114));
			print("Idset P1 x1000	: " + dev.rs(115));
			print("Idset P0 		: " + dev.rs(116));	
			break;
		case 5000:
			print("Idset P2 x1e6	: " + dev.rs(117));
			print("Idset P1 x1000	: " + dev.rs(118));
			print("Idset P0 		: " + dev.rs(119));	
			break;
	}
}
//--------------------

function CAL_PrintCoefIrateCompens()
{
	switch(CurrentRateTest * 100)
	{
		case 50:
			print("Irate compensation Offset	: " + dev.rs(41));
			print("Irate compensation K x1000	: " + dev.rs(42));
			break;
		case 75:
			print("Irate compensation Offset	: " + dev.rs(43));
			print("Irate compensation K x1000	: " + dev.rs(44));
			break;
		case 100:
			print("Irate compensation Offset	: " + dev.rs(45));
			print("Irate compensation K x1000	: " + dev.rs(46));
			break;
		case 250:
			print("Irate compensation Offset	: " + dev.rs(47));
			print("Irate compensation K x1000	: " + dev.rs(48));
			break;
		case 500:
			print("Irate compensation Offset	: " + dev.rs(49));
			print("Irate compensation K x1000	: " + dev.rs(50));	
			break;
		case 750:
			print("Irate compensation Offset	: " + dev.rs(51));
			print("Irate compensation K x1000	: " + dev.rs(52));	
			break;
		case 1000:
			print("Irate compensation Offset	: " + dev.rs(53));
			print("Irate compensation K x1000	: " + dev.rs(54));
			break;
		case 1500:
			print("Irate compensation Offset	: " + dev.rs(55));
			print("Irate compensation K x1000	: " + dev.rs(56));
			break;
		case 2500:
			print("Irate compensation Offset	: " + dev.rs(57));
			print("Irate compensation K x1000	: " + dev.rs(58));
			break;
		case 3000:
			print("Irate compensation Offset	: " + dev.rs(59));
			print("Irate compensation K x1000	: " + dev.rs(60));	
			break;
		case 5000:
			print("Irate compensation Offset	: " + dev.rs(61));
			print("Irate compensation K x1000	: " + dev.rs(62));
			break;
	}
}
//--------------------