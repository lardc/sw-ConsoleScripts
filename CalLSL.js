include("TestLSLH.js")
include("Tektronix.js")
include("CalGeneral.js")
include("Numeric.js")

// Calibration setup parameters
clsl_Rshunt = 750;			// in uOhms
clsl_Rload = 3333;			// in uOhms
clsl_GateRshunt = 10000;	// in mOhms
clsl_GatePulseWidth = 1000;	// in us

// Current range number
clsl_CurrentRange = 0;		// 0 = Range [ < 1000 A]; 1 = Range [ < 6500 A] for measure
//
clsl_Points = 10;
//
clsl_UtmMin = 500;			// in mV
clsl_UtmMax = 5000;			// in mV
//
clsl_ItmMin = 100			// in A
clsl_ItmMax = 1500			// in A
//
clsl_IgMin = 100;			// in mA
clsl_IgMax = 1000;			// in mA
//
clsl_UgMin = 1000;			// in mV
clsl_UgMax = 11000;			// in mV
//
clsl_Iterations = 1;
clsl_UseAvg = 1;

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
clsl_Ig = [];
clsl_IgSet = [];
clsl_Ug = [];

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

function CLSL_Init(portDevice, portTek, channelMeasureI, channelMeasureU, channelSync)
{
	if (channelMeasureI < 1 || channelMeasureI > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	clsl_chMeasureU = channelMeasureU;
	clsl_chMeasureI = channelMeasureI;
	clsl_chSync = channelSync;

	// Init device port
	dev.Disconnect();
	dev.co(portDevice);

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

function CLSL_CalibrateUtm()
{
	CLSL_ResetA();
	CLSL_ResetUtmCal();
	
	OverShootCurrentReset();
	
	// Tektronix init
	CLSL_TekInit(clsl_chMeasureU);
	
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
	
	OverShootCurrentRestore();
}

function CLSL_VerifyUtm()
{
	CLSL_ResetA();
	
	OverShootCurrentReset();
	
	// Tektronix init
	CLSL_TekInit(clsl_chMeasureU);
	
	// Reload values
	var clsl_UtmStp = Math.round((clsl_UtmMax - clsl_UtmMin) / (clsl_Points - 1));
	var VoltageArray = CGEN_GetRange(clsl_UtmMin, clsl_UtmMax, clsl_UtmStp);

	if (CLSL_CollectUtm(VoltageArray, clsl_Iterations))
	{
		CLSL_SaveUtm("LSL_Utm_fixed");

		// Plot relative error distribution
		scattern(clsl_UtmSc, clsl_UtmErr, "Voltage (in mV)", "Error (in %)", "Utm relative error " + clsl_UtmMin + " ... " + clsl_UtmMax + " mV");
	}
	
	OverShootCurrentRestore();
}

function CLSL_CalibrateItm()
{		
	CLSL_ResetA();
	CLSL_ResetItmCal();
	
	OverShootCurrentReset();
	
	// Tektronix init
	CLSL_TekInit(clsl_chMeasureI);

	// Reload values
	var clsl_ItmStp = Math.round((clsl_ItmMax - clsl_ItmMin) / (clsl_Points - 1));
	var CurrentArray = CGEN_GetRange(clsl_ItmMin, clsl_ItmMax, clsl_ItmStp);

	if (CLSL_CollectItm(CurrentArray, clsl_Iterations))
	{
		CLSL_SaveItm("LSL_Itm");

		// Plot relative error distribution
		scattern(clsl_ItmSc, clsl_ItmErr, "Current (in A)", "Error (in %)", "Itm relative error " + clsl_ItmMin + " ... " + clsl_ItmMax + " A");

		// Calculate correction
		clsl_ItmCorr = CGEN_GetCorrection2("LSL_Itm");
		CLSL_CalItm(clsl_ItmCorr[0], clsl_ItmCorr[1], clsl_ItmCorr[2]);
		CLSL_PrintCoefItm();
	}
	
	OverShootCurrentRestore();
}

function CLSL_VerifyItm()
{		
	CLSL_ResetA();
	
	OverShootCurrentReset();
	
	// Tektronix init
	CLSL_TekInit(clsl_chMeasureI);

	// Reload values
	var clsl_ItmStp = Math.round((clsl_ItmMax - clsl_ItmMin) / (clsl_Points - 1));
	var CurrentArray = CGEN_GetRange(clsl_ItmMin, clsl_ItmMax, clsl_ItmStp);

	if (CLSL_CollectItm(CurrentArray, clsl_Iterations))
	{
		CLSL_SaveItm("LSL_Itm_fixed");

		// Plot relative error distribution
		scattern(clsl_ItmSc, clsl_ItmErr, "Current (in A)", "Error (in %)", "Itm relative error " + clsl_ItmMin + " ... " + clsl_ItmMax + " A");
	}
	
	OverShootCurrentRestore();
}

function CLSL_CalibrateIset()
{		
	CLSL_ResetA();
	CLSL_ResetIsetCal();
	
	OverShootCurrentReset();
	
	// Tektronix init
	CLSL_TekInit(clsl_chMeasureI);

	// Reload values
	var clsl_ItmStp = Math.round((clsl_ItmMax - clsl_ItmMin) / (clsl_Points - 1));
	var CurrentArray = CGEN_GetRange(clsl_ItmMin, clsl_ItmMax, clsl_ItmStp);

	if (CLSL_CollectIset(CurrentArray, clsl_Iterations))
	{
		CLSL_SaveIset("LSL_Iset");

		// Plot relative error distribution
		scattern(clsl_IsetSc, clsl_IsetErr, "Current (in A)", "Error (in %)", "Itm set relative error " + clsl_ItmMin + " ... " + clsl_ItmMax + " A");

		// Calculate correction
		clsl_IsetCorr = CGEN_GetCorrection2("LSL_Iset");
		CLSL_CalIset(clsl_IsetCorr[0], clsl_IsetCorr[1], clsl_IsetCorr[2]);
		CLSL_PrintCoefIset();
	}
	
	OverShootCurrentRestore();
}

function CLSL_VerifyIset()
{		
	CLSL_ResetA();
	
	OverShootCurrentReset();
	
	// Tektronix init
	CLSL_TekInit(clsl_chMeasureI);

	// Reload values
	var clsl_ItmStp = Math.round((clsl_ItmMax - clsl_ItmMin) / (clsl_Points - 1));
	var CurrentArray = CGEN_GetRange(clsl_ItmMin, clsl_ItmMax, clsl_ItmStp);

	if (CLSL_CollectIset(CurrentArray, clsl_Iterations))
	{
		CLSL_SaveIset("LSL_Iset_fixed");

		// Plot relative error distribution
		scattern(clsl_IsetSc, clsl_IsetErr, "Current (in A)", "Error (in %)", "Itm set relative error " + clsl_ItmMin + " ... " + clsl_ItmMax + " A");
	}
	
	OverShootCurrentRestore();
}

function CLSL_CalibrateIg()
{		
	CLSL_ResetA();
	CLSL_ResetIgCal();
	
	// Tektronix init
	CLSL_GateTekInit(clsl_chMeasureI);

	// Reload values
	var clsl_IgStp = Math.round((clsl_IgMax - clsl_IgMin) / (clsl_Points - 1));
	var CurrentArray = CGEN_GetRange(clsl_IgMin, clsl_IgMax, clsl_IgStp);

	if (CLSL_CollectIg(CurrentArray, clsl_Iterations))
	{
		CLSL_SaveIg("LSL_Ig", "LSL_IgSet");

		// Plot relative error distribution
		scattern(clsl_IgSc, clsl_IgErr, "Current (in mA)", "Error (in %)", "Ig relative error " + clsl_IgMin + " ... " + clsl_IgMax + " mA");
		scattern(clsl_IgSc, clsl_IgSetErr, "Current (in mA)", "Error (in %)", "Ig set relative error " + clsl_IgMin + " ... " + clsl_IgMax + " mA");

		// Calculate correction
		clsl_IgCorr = CGEN_GetCorrection2("LSL_Ig");
		CLSL_CalIg(clsl_IgCorr[0], clsl_IgCorr[1], clsl_IgCorr[2]);
		//
		clsl_IgSetCorr = CGEN_GetCorrection2("LSL_IgSet");
		CLSL_CalIgSet(clsl_IgSetCorr[0], clsl_IgSetCorr[1], clsl_IgSetCorr[2]);

		// Print correction
		CLSL_PrintCoefIg();
	}
}

function CLSL_VerifyIg()
{		
	CLSL_ResetA();
	
	// Tektronix init
	CLSL_GateTekInit(clsl_chMeasureI);

	// Reload values
	var clsl_IgStp = Math.round((clsl_IgMax - clsl_IgMin) / (clsl_Points - 1));
	var CurrentArray = CGEN_GetRange(clsl_IgMin, clsl_IgMax, clsl_IgStp);

	if (CLSL_CollectIg(CurrentArray, clsl_Iterations))
	{
		CLSL_SaveIg("LSL_Ig_fixed", "LSL_IgSet_fixed");

		// Plot relative error distribution
		scattern(clsl_IgSc, clsl_IgSetErr, "Current (in mA)", "Error (in %)", "Ig relative error " + clsl_IgMin + " ... " + clsl_IgMax + " mA");
	}
}

function CLSL_CalibrateUg()
{
	CLSL_ResetA();
	CLSL_ResetUgCal();
	
	// Tektronix init
	CLSL_GateTekInit(clsl_chMeasureU);
	
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
		//
		clsl_UgSetCorr = CGEN_GetCorrection2("LSL_UgSet");
		CLSL_CalUgSet(clsl_UgSetCorr[0], clsl_UgSetCorr[1], clsl_UgSetCorr[2]);

		// Print correction
		CLSL_PrintCoefUg();
	}
}

function CLSL_VerifyUg()
{
	CLSL_ResetA();
	
	// Tektronix init
	CLSL_GateTekInit(clsl_chMeasureU);
	
	// Reload values
	var clsl_UgStp = Math.round((clsl_UgMax - clsl_UgMin) / (clsl_Points - 1));
	var VoltageArray = CGEN_GetRange(clsl_UgMin, clsl_UgMax, clsl_UgStp);

	if (CLSL_CollectUg(VoltageArray, clsl_Iterations))
	{
		CLSL_SaveUg("LSL_Ug_fixed");

		// Plot relative error distribution
		scattern(clsl_UgSc, clsl_UgErr, "Voltage (in mV)", "Error (in %)", "Ug relative error " + clsl_UgMin + " ... " + clsl_UgMax + " mV");
	}
}

function CLSL_CollectUtm(VoltageValues, IterationsCount)
{
	clsl_CntTotal = IterationsCount * VoltageValues.length;
	clsl_CntDone = 1;

	var AvgNum;
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
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < VoltageValues.length; j++)
		{
			print("-- result " + clsl_CntDone++ + " of " + clsl_CntTotal + " --");
			//
			
			CLSL_TekScale(clsl_chMeasureU, VoltageValues[j] / 1000);
			CLSL_TriggerInit(clsl_chSync)
			
			var PrintTemp = LSLH_Print;
			LSLH_Print = 0;
			
			for (var k = 0; k < AvgNum; k++)
			{
				if (!LSLH_StartMeasure(VoltageValues[j] / clsl_Rload * 1000))
					return 0;
			}
			
			LSLH_Print = PrintTemp;
			
			// Unit data
			var UtmRead = dev.r(198);
			clsl_Utm.push(UtmRead);
			print("Utmread, mV: " + UtmRead);

			// Scope data
			var UtmSc = CLSL_Measure(clsl_chMeasureU).toFixed(3) * 1000;
			clsl_UtmSc.push(UtmSc);
			print("Utmtek,  mV: " + UtmSc);

			// Relative error
			var UtmErr = ((UtmSc - UtmRead) / UtmRead * 100).toFixed(2);
			clsl_UtmErr.push(UtmErr);
			print("Utmerr,  %: " + UtmErr);
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CLSL_CollectItm(CurrentValues, IterationsCount)
{
	clsl_CntTotal = IterationsCount * CurrentValues.length;
	clsl_CntDone = 1;

	var AvgNum;
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
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			print("-- result " + clsl_CntDone++ + " of " + clsl_CntTotal + " --");
			//
			CLSL_TekScale(clsl_chMeasureI, CurrentValues[j] * clsl_Rshunt / 1000000);
			CLSL_TriggerInit(clsl_chSync);
			
			var PrintTemp = LSLH_Print;
			LSLH_Print = 0;
			
			for (var k = 0; k < AvgNum; k++)
			{
				if (!LSLH_StartMeasure(CurrentValues[j]))
					return 0;
			}
			
			LSLH_Print = PrintTemp;
			
			// Unit data
			var ItmRead = dev.r(206);
			clsl_Itm.push(ItmRead);
			print("Itmread, A: " + ItmRead);

			// Scope data
			var ItmSc = (CLSL_Measure(clsl_chMeasureI) / clsl_Rshunt * 1000000).toFixed(2);
			clsl_ItmSc.push(ItmSc);
			print("Itmtek, A: " + ItmSc);

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
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			print("-- result " + clsl_CntDone++ + " of " + clsl_CntTotal + " --");
			//
			CLSL_TekScale(clsl_chMeasureI, CurrentValues[j] * clsl_Rshunt / 1000000);
			CLSL_TriggerInit(clsl_chSync);
			
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
			var IsetSc = (CLSL_Measure(clsl_chMeasureI) / clsl_Rshunt * 1000000).toFixed(2);
			clsl_IsetSc.push(IsetSc);
			print("Itmtek, A: " + IsetSc);

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

function CLSL_CollectIg(CurrentValues, IterationsCount)
{
	clsl_CntTotal = IterationsCount * CurrentValues.length;
	clsl_CntDone = 1;

	var AvgNum;
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
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			print("-- result " + clsl_CntDone++ + " of " + clsl_CntTotal + " --");
			//
			CLSL_TekScale(clsl_chMeasureI, CurrentValues[j] * clsl_GateRshunt / 1000000);
			CLSL_TriggerInit(clsl_chSync)
			TEK_Send("trigger:main:edge:slope rise");
			TEK_Send("horizontal:position " + 0.0001);
			for (var k = 0; k < AvgNum; k++)
			{
				if (!LSLH_StartMeasure(100))
				sleep(500);
			}
			
			// Unit data
			var IgSet = CurrentValues[j];
			clsl_IgSet.push(IgSet);
			print("IgSet, mA: " + IgSet);
			//
			var Ig = dev.r(203);
			clsl_Ig.push(Ig);
			print("Ig, mA: " + Ig);

			// Scope data
			var IgSc = (CLSL_Measure(clsl_chMeasureI) / clsl_GateRshunt * 1000000).toFixed(2);
			clsl_IgSc.push(IgSc);
			print("IgTek, mA: " + IgSc);

			// Relative error
			var IgSetErr = ((IgSc - IgSet) / IgSet * 100).toFixed(2);
			clsl_IgSetErr.push(IgSetErr);
			print("IgSetErr, %: " + IgSetErr);
			//
			var IgErr = ((IgSc - Ig) / Ig * 100).toFixed(2);
			clsl_IgErr.push(IgErr);
			print("IgErr, %: " + IgErr);
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
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < VoltageValues.length; j++)
		{
			print("-- result " + clsl_CntDone++ + " of " + clsl_CntTotal + " --");
			//
			CLSL_TekScale(clsl_chMeasureU, VoltageValues[j] / 1000);
			CLSL_TriggerInit(clsl_chSync)
			TEK_Send("trigger:main:edge:slope rise");
			TEK_Send("horizontal:position " + 0.0001);
			for (var k = 0; k < AvgNum; k++)
			{
				if (!LSLH_StartMeasure(100))
				sleep(500);
			}
			
			// Unit data
			var UgSet = VoltageValues[j];
			clsl_Ug.push(UgSet);
			print("UgSet, mV: " + UgSet);
			//
			var Ug = dev.r(202);
			clsl_Ug.push(Ug);
			print("Ug, mV: " + Ug);

			// Scope data
			var UgSc = CLSL_Measure(clsl_chMeasureU).toFixed(3) * 1000;
			clsl_UgSc.push(UgSc);
			print("UgTek,  mV: " + UgSc);

			// Relative error
			var UgSetErr = ((UgSc - UgSet) / UgSet * 100).toFixed(2);
			clsl_UgSetErr.push(UgSetErr);
			print("UgSetErr,  %: " + UgSetErr);
			//
			var UgErr = ((UgSc - Ug) / Ug * 100).toFixed(2);
			clsl_UgErr.push(UgErr);
			print("UgSetErr,  %: " + UgErr);
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
	CLSL_TekCursor(Channel);
}

function CLSL_GateTekInit(Channel)
{
	TEK_Horizontal("25e-6", "0");
	TEK_ChannelInit(Channel, "1", "2");
	CLSL_TekCursor(Channel);
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
	TEK_Send("cursor:select:source ch" + Channel);
	sleep(500);

	var f = TEK_Exec("cursor:vbars:hpos2?");
	if (Math.abs(f) > 2.7e+8)
		f = 0;
	return parseFloat(f);
}

var OvershootCurrent;

function OverShootCurrentReset()
{
	OvershootCurrent = dev.r(40);
	dev.w(40, 0);
}

function OverShootCurrentRestore()
{
	dev.w(40, OvershootCurrent);
}

// Reset Arrays
function CLSL_ResetA()
{	
	// Results storage
	clsl_Utm = [];
	clsl_Itm = [];
	clsl_Iset = [];
	clsl_IgSet = [];
	clsl_Ug = [];

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

function CLSL_SaveIg(NameIg, NameIgSet)
{
	CGEN_SaveArrays(NameIg, clsl_Ig, clsl_IgSc, clsl_IgErr);
	CGEN_SaveArrays(NameIgSet, clsl_IgSc, clsl_IgSet, clsl_IgSetErr);
}

function CLSL_SaveUg(NameUg, NameUgSet)
{
	CGEN_SaveArrays(NameUg, clsl_Ug, clsl_UgSc, clsl_UgErr);
	CGEN_SaveArrays(NameUgSet, clsl_UgSc, clsl_UgSet, clsl_UgErr);
}

// Cal
function CLSL_CalUtm(P2, P1, P0)
{
	dev.ws(16, Math.round(P2 * 1e6));
	dev.w(15, Math.round(P1 * 1000));
	dev.ws(14, Math.round(P0));
}

function CLSL_CalItm(P2, P1, P0)
{
	switch (clsl_CurrentRange)
	{
		case 0:
			dev.ws(6, Math.round(P2 * 1e6));
			dev.w(5, Math.round(P1 * 1000));
			dev.ws(4, Math.round(P0));
			break;
		case 1:
			dev.ws(11, Math.round(P2 * 1e6));
			dev.w(10, Math.round(P1 * 1000));
			dev.ws(9, Math.round(P0));
			break;
		default:
			print("Incorrect I range.");
			break;
	}
}

function CLSL_CalIset(P2, P1, P0)
{
	dev.ws(43, Math.round(P2 * 1e6));
	dev.w(42, Math.round(P1 * 1000));
	dev.ws(41, Math.round(P0));
}

function CLSL_CalIg(P2, P1, P0)
{
	dev.ws(21, Math.round(P2 * 1e6));
	dev.w(20, Math.round(P1 * 1000));
	dev.ws(19, Math.round(P0));
}

function CLSL_CalIgSet(P2, P1, P0)
{
	dev.ws(59, Math.round(P2 * 1e6));
	dev.w(58, Math.round(P1 * 1000));
	dev.ws(57, Math.round(P0));
}

function CLSL_CalUg(P2, P1, P0)
{
	dev.ws(26, Math.round(P2 * 1e6));
	dev.w(25, Math.round(P1 * 1000));
	dev.ws(24, Math.round(P0));
}

function CLSL_CalUgSet(P2, P1, P0)
{
	dev.ws(54, Math.round(P2 * 1e6));
	dev.w(53, Math.round(P1 * 1000));
	dev.ws(52, Math.round(P0));
}

// Print
function CLSL_PrintCoefUtm()
{
	print("Utm P2 x1e6	: " + dev.rs(16));
	print("Utm P1 x1000	: " + dev.rs(15));
	print("Utm P0		: " + dev.rs(14));
}

function CLSL_PrintCoefItm()
{
	switch (clsl_CurrentRange)
	{
		case 0:
			print("Itm 0 P2 x1e6	: " + dev.rs(6));
			print("Itm 0 P1 x1000	: " + dev.rs(5));
			print("Itm 0 P0			: " + dev.rs(4));
			break;
		case 1:
			print("Itm 1 P2 x1e6	: " + dev.rs(11));
			print("Itm 1 P1 x1000	: " + dev.rs(10));
			print("Itm 1 P0			: " + dev.rs(9));
			break;
		default:
			print("Incorrect I range.");
			break;
	}
}

function CLSL_PrintCoefIset()
{
	print("ItmSet P2 x1e6	: " + dev.rs(43));
	print("ItmSet P1 x1000	: " + dev.rs(42));
	print("ItmSet P0		: " + dev.rs(41));
}

function CLSL_PrintCoefIg()
{
	print("Ig P2 x1e6	: " + dev.rs(21));
	print("Ig P1 x1000	: " + dev.rs(20));
	print("Ig P0		: " + dev.rs(19));
}

function CLSL_PrintCoefIgSet()
{
	print("Ig Set P2 x1e6	: " + dev.rs(59));
	print("Ig Set P1 x1000	: " + dev.rs(58));
	print("Ig Set P0		: " + dev.rs(57));
}

function CLSL_PrintCoefUg()
{
	print("Ug P2 x1e6	: " + dev.rs(26));
	print("Ug P1 x1000	: " + dev.rs(25));
	print("Ug P0		: " + dev.rs(24));
}

function CLSL_PrintCoefUgSet()
{
	print("Ug Set P2 x1e6	: " + dev.rs(54));
	print("Ug Set P1 x1000	: " + dev.rs(53));
	print("Ug Set P0		: " + dev.rs(52));
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

function CLSL_ResetIgCal()
{
	CLSL_CalIg(0, 1, 0);
	CLSL_CalIgSet(0, 1, 0);
}

function CLSL_ResetUgCal()
{
	CLSL_CalUg(0, 1, 0);
	CLSL_CalUgSet(0, 1, 0);
}

// HMIU calibration
function Measuring_Filter()
{
	allowedMeasuring = "TPS2000";
	return allowedMeasuring;
}

function CSL_Initialize()
{
	clsl_chMeasureI = 1;
	clsl_chMeasureU = 2;
	clsl_chSync = 3;
	for (var i = 1; i <= 4; i++) {
		if ((i == clsl_chMeasureU) || (i == clsl_chMeasureI) || (i == clsl_chSync))
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
	TEK_ChannelInit(clsl_chSync, "1", "1");
	CLSL_TriggerInit(clsl_chSync);
}

function CSL_VerifyItm(rangeId, rangeMin, rangeMax, count, verificationCount, resistance, addedResistance)
{
	clsl_CurrentRange = rangeId;
	clsl_ItmMin = rangeMin;
	clsl_ItmMax = rangeMax;
	clsl_Points = count;
	clsl_Iterations = verificationCount;
	clsl_Rshunt = resistance;
	clsl_UseAvg = 0;
	CSL_Initialize();
	CLSL_VerifyIset();
	return [clsl_IsetSc, clsl_Iset, clsl_IsetSc, clsl_IsetErr];
}

function CSL_VerifyVtm(rangeId, rangeMin, rangeMax, count, verificationCount, resistance, addedResistance)
{
	clsl_CurrentRange = rangeId;
	clsl_UtmMin = rangeMin;
	clsl_UtmMax = rangeMax;
	clsl_Points = count;
	clsl_Iterations = verificationCount;
	clsl_Rload = resistance;
	clsl_UseAvg = 0;
	CSL_Initialize();
	CLSL_VerifyUtm();
	return [clsl_UtmSc, clsl_Utm, clsl_UtmSc, clsl_UtmErr];
}