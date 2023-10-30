include("TestSVTU.js")
include("Tektronix.js")
include("CalGeneral.js")
include("DMM6500.js")
// include("Numeric.js")

// Calibration setup parameters
clsl_Rshunt = 750;					// in uOhms
clsl_Rload = 3527;		     			// in uOhms
clsl_GateRshunt = 10000;			// in mOhms

// Setup parameters for DMM6000
clsl_V_PulsePlate 	= 1000 			// in us
clsl_V_TriggerDelay	= 0				// in s
clsl_measuring_device = "DMM6000";	// "DMM6000" or "TPS2000"

// Current range number
clsl_CurrentRange = 0;				// 0 = Range [ < 300 A]; 1 = Range [ < 1700 A] for measure
//
clsl_Points = 10;
//
clsl_UtmMin = 400;					// in mV
clsl_UtmMax = 5200;					// in mV
//
clsl_ItmMin = 301					// in A
clsl_ItmMax = 1700					// in A

//ItmSetArray = [50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300];
ItmSetArray = [301, 450, 600, 750, 900, 1050, 1200, 1350, 1500, 1700];
//ItmSetArray = [301, 310, 320, 330, 340, 350, 360, 370, 380, 390, 400, 410,420,430,440,450,460,470,480,490,500,510,520,530,540,550,560,580,590,600,610,620,630,640,650];
//ItmSetArray = [50, 60,70,80,90,100,110,120,130,140,150,160,170,180,190,200,210,220,230,240,250,260,270,280,290,300];
//
clsl_UgMin = 10;						// in V
clsl_UgMax = 20;					// in V
//
clsl_Iterations = 1;
clsl_UseAvg = 0;

// Counters
clsl_CntTotal = 0;
clsl_CntDone = 0;

// Channels
clsl_chMeasureI = 1;
clsl_chMeasureU = 2;
clsl_chSync = 3;

// Results storage
clsl_Utm = [];
clsl_Itm = [];
clsl_Iset = [];
clsl_Ug = [];
clsl_UgSet = [];

// Tektronix data
clsl_UtmSc = [];
clsl_ItmSc = [];
clsl_IsetSc = [];
clsl_UgSc = [];

// Relative error
clsl_UtmErr = [];
clsl_ItmErr = [];
clsl_IsetErr = [];
clsl_UgErr = [];
clsl_UgSetErr = [];

clsl_DAC = [];

// Correction
clsl_UtmCorr = [];
clsl_ItmCorr = [];
clsl_IsetCorr = [];
clsl_UgCorr = [];
clsl_UgSetCorr = [];

function CLSL_Init_Tek(portDevice, portTek, channelMeasureI, channelMeasureU, channelSync)
{
	// Init device port
	dev.Disconnect();
	dev.co(portDevice);

	if (channelMeasureI < 1 || channelMeasureI > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	clsl_chMeasureU = channelMeasureU;
	clsl_chMeasureI = channelMeasureI;
	clsl_chSync = channelSync;

	// Init Tektronix port
	TEK_PortInit(portTek);
	
	// Tektronix init
	for (var i = 1; i <= 4; i++)
	{
		if ((i == clsl_chMeasureU) || (i == channelMeasureI) || (i == clsl_chSync))
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
	
	TEK_ChannelInit(clsl_chSync, "1", "1");
	CLSL_TriggerInit(clsl_chSync);
}

function CLSL_Init_DMM(portDevice)
{
	// Init device port
	dev.Disconnect();
	dev.co(portDevice);

	// DMM6500 init
	KEI_Reset();
}

function CLSL_CalibrateUtm()
{
	CLSL_ResetA();
	CLSL_ResetUtmCal();
	
	
	// Tektronix init
	if(clsl_measuring_device == "TPS2000")
		CLSL_TekInit(clsl_chMeasureU);
	else if (clsl_measuring_device == "DMM6000")
	{
		KEI_ConfigVoltage(clsl_V_PulsePlate);
		KEI_ConfigExtTrigger(clsl_V_TriggerDelay);
	}

	// Reload values
	var clsl_UtmStp = Math.round((clsl_UtmMax - clsl_UtmMin) / (clsl_Points - 1));
	var VoltageArray = CGEN_GetRange(clsl_UtmMin, clsl_UtmMax, clsl_UtmStp);
	
	if (CLSL_CollectUtm(VoltageArray, clsl_Iterations))
	{
		CLSL_SaveUtm("LSL_Utm");

		// Plot relative error distribution
		scattern(clsl_UtmSc, clsl_UtmErr, "Voltage (in mV)", "Error (in %)", "Utm relative error " + clsl_UtmMin + " ... " + clsl_UtmMax + " mV");

		// Calculate correction
		clsl_UtmCorr = CGEN_GetCorrection2("LSL_Utm");
		CLSL_CalUtm(clsl_UtmCorr[0], clsl_UtmCorr[1], clsl_UtmCorr[2]);
		CLSL_PrintCoefUtm();
	}
}

function CLSL_VerifyUtm()
{
	CLSL_ResetA();

	// Tektronix init
	if(clsl_measuring_device == "TPS2000")
		CLSL_TekInit(clsl_chMeasureU);
	else if (clsl_measuring_device == "DMM6000")
	{
		KEI_ConfigVoltage(clsl_V_PulsePlate);
		KEI_ConfigExtTrigger(clsl_V_TriggerDelay);
	}

	// Reload values
	var clsl_UtmStp = Math.round((clsl_UtmMax - clsl_UtmMin) / (clsl_Points - 1));
	var VoltageArray = CGEN_GetRange(clsl_UtmMin, clsl_UtmMax, clsl_UtmStp);

	if (CLSL_CollectUtm(VoltageArray, clsl_Iterations))
	{
		CLSL_SaveUtm("LSL_Utm_fixed");

		// Plot relative error distribution
		scattern(clsl_UtmSc, clsl_UtmErr, "Voltage (in mV)", "Error (in %)", "Utm relative error " + clsl_UtmMin + " ... " + clsl_UtmMax + " mV");
	}
}

function CLSL_CalibrateItm()
{		
	CLSL_ResetA();
	CLSL_ResetItmCal();
	

	// Tektronix init
	if(clsl_measuring_device == "TPS2000")
		CLSL_TekInit(clsl_chMeasureI);
	else if (clsl_measuring_device == "DMM6000")
	{
		KEI_ConfigVoltage(clsl_V_PulsePlate);
		KEI_ConfigExtTrigger(clsl_V_TriggerDelay);
	}

	// Reload values
//	var clsl_ItmStp = Math.round((clsl_ItmMax - clsl_ItmMin) / (clsl_Points - 1));
//	var CurrentArray = CGEN_GetRange(clsl_ItmMin, clsl_ItmMax, clsl_ItmStp);

	if (CLSL_CollectItm(ItmSetArray, clsl_Iterations))
	{
		CLSL_SaveItm("LSL_Itm");

		// Plot relative error distribution
		scattern(clsl_ItmSc, clsl_ItmErr, "Current (in A)", "Error (in %)", "Itm relative error " + clsl_ItmMin + " ... " + clsl_ItmMax + " A");

		// Calculate correction
		clsl_ItmCorr = CGEN_GetCorrection2("LSL_Itm");
		CLSL_CalItm(clsl_ItmCorr[0], clsl_ItmCorr[1], clsl_ItmCorr[2]);

		CLSL_PrintCoefItm();
	}
}

function CLSL_VerifyItm()
{		
	CLSL_ResetA();
	
	
	// Tektronix init
	if(clsl_measuring_device == "TPS2000")
		CLSL_TekInit(clsl_chMeasureI);
	else if (clsl_measuring_device == "DMM6000")
	{
		KEI_ConfigVoltage(clsl_V_PulsePlate);
		KEI_ConfigExtTrigger(clsl_V_TriggerDelay);
	}

	// Reload values
	//var clsl_ItmStp = Math.round((clsl_ItmMax - clsl_ItmMin) / (clsl_Points - 1));
	//var CurrentArray = CGEN_GetRange(clsl_ItmMin, clsl_ItmMax, clsl_ItmStp);

	if (CLSL_CollectItm(ItmSetArray, clsl_Iterations))
	{
		CLSL_SaveItm("LSL_Itm_fixed");

		// Plot relative error distribution
		scattern(clsl_ItmSc, clsl_ItmErr, "Current (in A)", "Error (in %)", "Itm relative error " + clsl_ItmMin + " ... " + clsl_ItmMax + " A");
	}
}

function CLSL_CalibrateIset()
{		
	CLSL_ResetA();
	CLSL_ResetIsetCal();
	
	
	// Tektronix init
	if(clsl_measuring_device == "TPS2000")
		CLSL_TekInit(clsl_chMeasureI);
	else if (clsl_measuring_device == "DMM6000")
	{
		KEI_ConfigVoltage(clsl_V_PulsePlate);
		KEI_ConfigExtTrigger(clsl_V_TriggerDelay);
	}

	//var clsl_ItmStp = Math.round((clsl_ItmMax - clsl_ItmMin) / (clsl_Points - 1));
	//var CurrentArray = CGEN_GetRange(clsl_ItmMin, clsl_ItmMax, clsl_ItmStp);

	if (CLSL_CollectIset(ItmSetArray, clsl_Iterations))
	{
		CLSL_SaveIset("LSL_Iset");

		// Plot relative error distribution
		scattern(clsl_IsetSc, clsl_IsetErr, "Current (in A)", "Error (in %)", "Itm set relative error " + clsl_ItmMin + " ... " + clsl_ItmMax + " A");

		// Calculate correction
		clsl_IsetCorr = CGEN_GetCorrection2("LSL_Iset");
		CLSL_CalIset(clsl_IsetCorr[0], clsl_IsetCorr[1], clsl_IsetCorr[2]);
		CLSL_PrintCoefIset();
	}
}

function CLSL_VerifyIset()
{		
	CLSL_ResetA();
	
	
	// Tektronix init
	if(clsl_measuring_device == "TPS2000")
		CLSL_TekInit(clsl_chMeasureI);
	else if (clsl_measuring_device == "DMM6000")
	{
		KEI_ConfigVoltage(clsl_V_PulsePlate);
		KEI_ConfigExtTrigger(clsl_V_TriggerDelay);
	}

	//var clsl_ItmStp = Math.round((clsl_ItmMax - clsl_ItmMin) / (clsl_Points - 1));
	//var CurrentArray = CGEN_GetRange(clsl_ItmMin, clsl_ItmMax, clsl_ItmStp);

	if (CLSL_CollectIset(ItmSetArray, clsl_Iterations))
	{
		CLSL_SaveIset("LSL_Iset_fixed");

		// Plot relative error distribution
		scattern(clsl_IsetSc, clsl_IsetErr, "Current (in A)", "Error (in %)", "Itm set relative error " + clsl_ItmMin + " ... " + clsl_ItmMax + " A");
	}
}

function CLSL_CalibrateUg()
{
	CLSL_ResetA();
	CLSL_ResetUgCal();
	
	// Tektronix init
	if(clsl_measuring_device == "TPS2000")
		CLSL_GateTekInit(clsl_chMeasureU);
	else if (clsl_measuring_device == "DMM6000")
	{
		KEI_ConfigVoltage(clsl_V_PulsePlate);
		KEI_ConfigExtTrigger(clsl_V_TriggerDelay);
	}
	
	// Reload values
	var clsl_UgStp = Math.round((clsl_UgMax - clsl_UgMin) / (clsl_Points - 1));
	var VoltageArray = CGEN_GetRange(clsl_UgMin, clsl_UgMax, clsl_UgStp);
	
	if (CLSL_CollectUg(VoltageArray, clsl_Iterations))
	{
		CLSL_SaveUg("LSL_Ug", "LSL_UgSet");

		// Plot relative error distribution
		scattern(clsl_UgSc, clsl_UgErr, "Voltage (in mV)", "Error (in %)", "Ug relative error " + clsl_UgMin + " ... " + clsl_UgMax + " mV");
		scattern(clsl_UgSc, clsl_UgSetErr, "Voltage (in mV)", "Error (in %)", "Ug set relative error " + clsl_UgMin + " ... " + clsl_UgMax + " mV");

		// Calculate correction
		clsl_UgCorr = CGEN_GetCorrection2("LSL_Ug");
		CLSL_CalUg(clsl_UgCorr[0], clsl_UgCorr[1], clsl_UgCorr[2]);
		
		// Print correction Ug
		CLSL_PrintCoefUg();
		
		// Calculate correction
		clsl_UgSetCorr = CGEN_GetCorrection2("LSL_UgSet");
		CLSL_CalUgSet(clsl_UgSetCorr[0], clsl_UgSetCorr[1], clsl_UgSetCorr[2]);

		// Print correction UgSet
		CLSL_PrintCoefUgSet();
	}
}

function CLSL_VerifyUg()
{
	CLSL_ResetA();
	// Tektronix init
	if(clsl_measuring_device == "TPS2000")
		CLSL_GateTekInit(clsl_chMeasureU);
	else if (clsl_measuring_device == "DMM6000")
	{
		KEI_ConfigVoltage(clsl_V_PulsePlate);
		KEI_ConfigExtTrigger(clsl_V_TriggerDelay);
	}

	// Reload values
	var clsl_UgStp = Math.round((clsl_UgMax - clsl_UgMin) / (clsl_Points - 1));
	var VoltageArray = CGEN_GetRange(clsl_UgMin, clsl_UgMax, clsl_UgStp);

	if (CLSL_CollectUg(VoltageArray, clsl_Iterations))
	{
		CLSL_SaveUg("LSL_Ug_fixed", "LSL_UgSet_fixed");

		// Plot relative error distribution
		scattern(clsl_UgSc, clsl_UgErr, "Voltage (in mV)", "Error (in %)", "Ug relative error " + clsl_UgMin + " ... " + clsl_UgMax + " mV");
		scattern(clsl_UgSc, clsl_UgSetErr, "Voltage (in mV)", "Error (in %)", "Ug set relative error " + clsl_UgMin + " ... " + clsl_UgMax + " mV");
	}
}

function CLSL_CollectUtm(VoltageValues, IterationsCount)
{
	clsl_CntTotal = IterationsCount * VoltageValues.length;
	clsl_CntDone = 1;

	var AvgNum;
	if(clsl_measuring_device == "TPS2000")
	{
		if (clsl_UseAvg)
		{
			AvgNum = 4;
			TEK_AcquireAvg(AvgNum);
		}
		else
		{
			AvgNum = 1;
			TEK_AcquireSample();
		}
	}
	else if (clsl_measuring_device == "DMM6000")
		AvgNum = 1;

	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < VoltageValues.length; j++)
		{
			print("-- result " + clsl_CntDone++ + " of " + clsl_CntTotal + " --");
			
			if(clsl_measuring_device == "TPS2000")
				CLSL_TekScale(clsl_chMeasureU, VoltageValues[j] / 1000);
			else if (clsl_measuring_device == "DMM6000")
			{
				KEI_SetVoltageRange(VoltageValues[j] / 1000);
				KEI_ActivateTrigger();
			}

			var PrintTemp = LSLH_Print;
			LSLH_Print = 0;
			
			for (var k = 0; k < AvgNum; k++)
			{
				if (!LSLH_StartMeasure(VoltageValues[j] / clsl_Rload * 1000))
					return 0;
			}
			
			LSLH_Print = PrintTemp;
			
			// Unit data
			var UtmRead = dev.r(200);
			clsl_Utm.push(UtmRead);
			print("Utmread, mV: " + UtmRead);

			// Scope data
			if(clsl_measuring_device == "TPS2000")
				var UtmSc = (CLSL_Measure(clsl_chMeasureU) * 1000).toFixed(2);
			else if (clsl_measuring_device == "DMM6000")
				var UtmSc = (KEI_ReadAverage() * 1000).toFixed(3);

			clsl_UtmSc.push(UtmSc);

			if(clsl_measuring_device == "TPS2000")
				print("Utmtek,  mV: " + UtmSc);
			else if (clsl_measuring_device == "DMM6000")
				print("UtmDMM,  mV: " + UtmSc);

			// Relative error
			var UtmErr = ((UtmSc - UtmRead) / UtmRead * 100).toFixed(2);
			clsl_UtmErr.push(UtmErr);
			print("Utmerr,  %: " + UtmErr);
			print("--------------------");
			
			if (anykey()) return 0;

			sleep(500);
		}
	}

	return 1;
}

function CLSL_CollectItm(CurrentValues, IterationsCount)
{
	clsl_CntTotal = IterationsCount * CurrentValues.length;
	clsl_CntDone = 1;

	var AvgNum;
	if(clsl_measuring_device == "TPS2000")
	{
		if (clsl_UseAvg)
		{
			AvgNum = 4;
			TEK_AcquireAvg(AvgNum);
		}
		else
		{
			AvgNum = 1;
			TEK_AcquireSample();
		}
	}
	else if (clsl_measuring_device == "DMM6000")
		AvgNum = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{					
			print("-- result " + clsl_CntDone++ + " of " + clsl_CntTotal + " --");
			//
			if(clsl_measuring_device == "TPS2000")
				CLSL_TekScale(clsl_chMeasureI, CurrentValues[j] * clsl_Rshunt / 1000000);
			else if (clsl_measuring_device == "DMM6000")
			{
				KEI_SetVoltageRange((CurrentValues[j]) * clsl_Rshunt / 1000000);
				KEI_ActivateTrigger();
			}

			var PrintTemp = LSLH_Print;
			LSLH_Print = 0;
			
			for (var k = 0; k < AvgNum; k++)
			{
				if (!LSLH_StartMeasure(CurrentValues[j]))
					return 0;
			}
			
			LSLH_Print = PrintTemp;
			
			// Unit data
			var ItmRead = dev.rf(201);
			clsl_Itm.push(ItmRead);
			print("Itmread, A: " + ItmRead);

			// Scope data
			if(clsl_measuring_device == "TPS2000")
				var ItmSc = (CLSL_Measure(clsl_chMeasureI) / clsl_Rshunt * 1000000).toFixed(2);
			else if (clsl_measuring_device == "DMM6000")
				var ItmSc = (KEI_ReadAverage() / clsl_Rshunt * 1000000).toFixed(4);

			clsl_ItmSc.push(ItmSc);

			if(clsl_measuring_device == "TPS2000")
				print("Itmtek, A: " + ItmSc);
			else if (clsl_measuring_device == "DMM6000")
				print("ItmDMM, A: " + ItmSc);

			// Relative error
			var ItmErr = ((ItmSc - ItmRead) / ItmRead * 100).toFixed(2);
			clsl_ItmErr.push(ItmErr);
			print("Itmerr, %: " + ItmErr);
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CLSL_CollectIset(CurrentValues, IterationsCount)
{
	clsl_CntTotal = IterationsCount * CurrentValues.length;
	clsl_CntDone = 1;

	var AvgNum;
	if(clsl_measuring_device == "TPS2000")
	{
		if (clsl_UseAvg)
		{
			AvgNum = 4;
			TEK_AcquireAvg(AvgNum);
		}
		else
		{
			AvgNum = 1;
			TEK_AcquireSample();
		}
	}
	else if (clsl_measuring_device == "DMM6000")
		AvgNum = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			print("-- result " + clsl_CntDone++ + " of " + clsl_CntTotal + " --");
			//
			if(clsl_measuring_device == "TPS2000")
				CLSL_TekScale(clsl_chMeasureI, CurrentValues[j] * clsl_Rshunt / 1000000);
			else if (clsl_measuring_device == "DMM6000")
			{
				KEI_SetVoltageRange(CurrentValues[j] * clsl_Rshunt / 1000000);
				KEI_ActivateTrigger();
			}
			
			var PrintTemp = LSLH_Print;
			LSLH_Print = 0;
			
			for (var k = 0; k < AvgNum; k++)
			{
				if (!LSLH_StartMeasure(CurrentValues[j]))
					return 0;
			}
			
			LSLH_Print = PrintTemp;
			
			// Unit data
			var Iset = CurrentValues[j];
			clsl_Iset.push(Iset);
			print("Iset, A: " + Iset);

			// Scope data
			if(clsl_measuring_device == "TPS2000")
				var IsetSc = (CLSL_Measure(clsl_chMeasureI) / clsl_Rshunt * 1000000).toFixed(2);
			else if (clsl_measuring_device == "DMM6000")
				var IsetSc = (KEI_ReadAverage() / clsl_Rshunt * 1000000).toFixed(4);

			clsl_IsetSc.push(IsetSc);

			if(clsl_measuring_device == "TPS2000")
				print("ItmSettek, A: " + IsetSc);
			else if (clsl_measuring_device == "DMM6000")
				print("ItmSetDMM, A: " + IsetSc);

			// Relative error
			var IsetErr = ((IsetSc - Iset) / Iset * 100).toFixed(2);
			clsl_IsetErr.push(IsetErr);
			print("Iseterr, %: " + IsetErr);
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CLSL_CollectUg(VoltageValues, IterationsCount)
{
	clsl_CntTotal = IterationsCount * VoltageValues.length;
	clsl_CntDone = 1;

	var AvgNum;
	if(clsl_measuring_device == "TPS2000")
	{
		if (clsl_UseAvg)
		{
			AvgNum = 4;
			TEK_AcquireAvg(AvgNum);
		}
		else
		{
			AvgNum = 1;
			TEK_AcquireSample();
		}
	}
	else if (clsl_measuring_device == "DMM6000")
		AvgNum = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < VoltageValues.length; j++)
		{
			print("-- result " + clsl_CntDone++ + " of " + clsl_CntTotal + " --");
			//
			if(clsl_measuring_device == "TPS2000")
				CLSL_TekScale(clsl_chMeasureU, VoltageValues[j] / 1000);
			else if (clsl_measuring_device == "DMM6000")
			{
				KEI_SetVoltageRange(VoltageValues[j]+3);
				KEI_ActivateTrigger();
			}

			GateVoltage = VoltageValues[j];
			dev.wf(129, GateVoltage);

			if(clsl_measuring_device == "TPS2000")
			{
				TEK_Send("trigger:main:edge:slope rise");
				TEK_Send("horizontal:position " + 0.0002);
			}

			var PrintTemp = LSLH_Print;
			LSLH_Print = 0;

			for (var k = 0; k < AvgNum; k++)
			{
				if (!LSLH_StartMeasure(100))
				sleep(500);
			}

			LSLH_Print = PrintTemp;

			// Unit data
			var UgSet = VoltageValues[j];
			clsl_UgSet.push(UgSet);
			print("UgSet, mV: " + UgSet);
			//
			var Ug = dev.rf(202);
			clsl_Ug.push(Ug);
			print("Ug, mV: " + Ug);

			// Scope data
			if(clsl_measuring_device == "TPS2000")
				var UgSc = (CLSL_Measure(clsl_chMeasureU) * 1000).toFixed(2);
			else if (clsl_measuring_device == "DMM6000")
				var UgSc = (KEI_ReadAverage() * 1).toFixed(4);

			clsl_UgSc.push(UgSc);

			if(clsl_measuring_device == "TPS2000")
				print("UgTek,  mV: " + UgSc);
			else if (clsl_measuring_device == "DMM6000")
				print("UgDMM,  mV: " + UgSc);

			// Relative error
			var UgSetErr = ((UgSc - UgSet) / UgSet * 100).toFixed(2);
			clsl_UgSetErr.push(UgSetErr);
			print("UgSetErr,  %: " + UgSetErr);
			//
			var UgErr = ((UgSc - Ug) / Ug * 100).toFixed(2);
			clsl_UgErr.push(UgErr);
			print("UgErr,  %: " + UgErr);
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CLSL_TriggerInit(Channel)
{
	TEK_TriggerInit(clsl_chSync, 2.5);
	TEK_Send("trigger:main:edge:slope fall");
	sleep(1000);
}

function CLSL_TekScale(Channel, Value)
{
	// 0.9 - use 90% of full range
	// 8 - number of scope grids in full scale
	var scale = (Value / (8 * 0.9));
	TEK_Send("ch" + Channel + ":scale " + scale);
}

function CLSL_TekInit(Channel)
{
	TEK_Horizontal("1e-3", "0");
	TEK_ChannelInit(Channel, "1", "2");
	CLSL_TekMeasurement(Channel);
}

function CLSL_GateTekInit(Channel)
{
	TEK_Horizontal("25e-6", "5e-6");
	TEK_ChannelInit(Channel, "1", "2");
	CLSL_TekMeasurement(Channel);
}

function CLSL_TekCursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send("cursor:vbars:position1 0");
	TEK_Send("cursor:vbars:position2 0");
}

function CLSL_Measure(Channel)
{
	sleep(1000);
	return TEK_Measure(Channel);
}

function CLSL_TekMeasurement(Channel)
{
	TEK_Send("measurement:meas" + Channel + ":source ch" + Channel);
	TEK_Send("measurement:meas" + Channel + ":type maximum");
}

// Reset Arrays
function CLSL_ResetA()
{	
	// Results storage
	clsl_Utm = [];
	clsl_Itm = [];
	clsl_Iset = [];
	clsl_Ig = [];
	clsl_IgSet = [];
	clsl_Ug = [];
	clsl_UgSet = [];

	// Tektronix data
	clsl_UtmSc = [];
	clsl_ItmSc = [];
	clsl_IsetSc = [];
	clsl_IgSc = [];
	clsl_UgSc = [];

	// Relative error
	clsl_UtmErr = [];
	clsl_ItmErr = [];
	clsl_IsetErr = [];
	clsl_IgErr = [];
	clsl_IgSetErr = [];
	clsl_UgErr = [];
	clsl_UgSetErr = [];

	// Correction
	clsl_UtmCorr = [];
	clsl_ItmCorr = [];
	clsl_IsetCorr = [];
	clsl_IgCorr = [];
	clsl_IgSetCorr = [];
	clsl_UgCorr = [];
	clsl_UgSetCorr = [];
}

// Save
function CLSL_SaveUtm(NameUtm)
{
	CGEN_SaveArrays(NameUtm, clsl_Utm, clsl_UtmSc, clsl_UtmErr);
}

function CLSL_SaveItm(NameItm)
{
	CGEN_SaveArrays(NameItm, clsl_Itm, clsl_ItmSc, clsl_ItmErr);
}

function CLSL_SaveIset(NameIset)
{
	CGEN_SaveArrays(NameIset, clsl_IsetSc, clsl_Iset, clsl_IsetErr);
}

function CLSL_SaveUg(NameUg, NameUgSet)
{
	CGEN_SaveArrays(NameUg, clsl_Ug, clsl_UgSc, clsl_UgErr);
	CGEN_SaveArrays(NameUgSet, clsl_UgSc, clsl_UgSet, clsl_UgErr);
}

// Cal
function CLSL_CalUtm(P2, P1, P0)
{
	dev.wf(10, P2);
	dev.wf(11, P1);
	dev.wf(12, P0);
}

function CLSL_CalItm(P2, P1, P0)
{
	switch (clsl_CurrentRange)
	{
		case 0:
			dev.wf(0, P2);
			dev.wf(1, P1);
			dev.wf(2, P0);
			break;
		case 1:
			dev.wf(5, P2);
			dev.wf(6, P1);
			dev.wf(7, P0);
			break;
		default:
			print("Incorrect I range.");
			break;
	}
}

function CLSL_CalIset(P2, P1, P0)
{

	switch (clsl_CurrentRange)
	{
		case 0:
			dev.wf(30, P2);
			dev.wf(31, P1);
			dev.wf(32, P0);
			break;
		case 1:
			dev.wf(50, P2);
			dev.wf(51, P1);
			dev.wf(52, P0);
			break;
		default:
			print("Incorrect I range.");
			break;
	}

}

function CLSL_CalUg(P2, P1, P0)
{
	dev.wf(15, P2);
	dev.wf(16, P1);
	dev.wf(17, P0);
}

function CLSL_CalUgSet(P2, P1, P0)
{
	dev.wf(20, P2);
	dev.wf(21, P1);
	dev.wf(22, P0);
}

// Print
function CLSL_PrintCoefUtm()
{
	print("Utm P2 : " + dev.rf(10));
	print("Utm P1 : " + dev.rf(11));
	print("Utm P0 : " + dev.rf(12));
}

function CLSL_PrintCoefItm()
{
	switch (clsl_CurrentRange)
	{
		case 0:
			print("Itm 0 P2 : " + dev.rf(0));
			print("Itm 0 P1	: " + dev.rf(1));
			print("Itm 0 P0	: " + dev.rf(2));
			break;
		case 1:
			print("Itm 1 P2 : " + dev.rf(5));
			print("Itm 1 P1 : " + dev.rf(6));
			print("Itm 1 P0 : " + dev.rf(7));
			break;
		default:
			print("Incorrect I range.");
			break;
	}
}

function CLSL_PrintCoefIset()
{
	switch (clsl_CurrentRange)
	{
		case 0:
			print("ItmSet P2 : " + dev.rf(30));
			print("ItmSet P1 : " + dev.rf(31));
			print("ItmSet P0 : " + dev.rf(32));
			break;
		case 1:
			print("Itm 1 P2 : " + dev.rf(50));
			print("Itm 1 P1 : " + dev.rf(51));
			print("Itm 1 P0 : " + dev.rf(52));
			break;
		default:
			print("Incorrect I range.");
			break;
	}
}

function CLSL_PrintCoefUg()
{
	print("Ug P2 : " + dev.rf(15));
	print("Ug P1 : " + dev.rf(16));
	print("Ug P0 : " + dev.rf(17));
}

function CLSL_PrintCoefUgSet()
{
	print("Ug Set P2 : " + dev.rf(20));
	print("Ug Set P1 : " + dev.rf(21));
	print("Ug Set P0 : " + dev.rf(22));
}

// Reset
function CLSL_ResetUtmCal()
{
	CLSL_CalUtm(0, 1, 0);
}

function CLSL_ResetItmCal()
{
	CLSL_CalItm(0, 1, 0);
}

function CLSL_ResetIsetCal()
{
	CLSL_CalIset(0, 1, 0);
}

function CLSL_ResetUgCal()
{
	CLSL_CalUg(0, 1, 0);
	CLSL_CalUgSet(0, 1, 0);
}