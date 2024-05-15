include("CalGeneral")
include("TestLSLH.js")
include("TestSL.js")
include("MeasurementInstruments.js")
include("Numeric.js")

// variables
clsl_Rshunt = 750;					// in uOhms
clsl_Rload = 3333;					// in uOhms
clsl_GateRshunt = 10000;			// in mOhms
clsl_GatePulseWidth = 1000;			// in us

// Setup parameters for DMM6000
clsl_V_PulsePlate 	= 5000 			// in us
clsl_V_TriggerDelay	= 2500e-6		// in s
clsl_measuring_device = "TPS2000";	// "DMM6000" or "TPS2000"

// Current range number
clsl_CurrentRange = 0;				// 0 = Range [ < 1000 A]; 1 = Range [ < 6500 A] for measure
//
clsl_Points = 10;
//
clsl_UtmMin = 500;					// in mV
clsl_UtmMax = 5000;					// in mV
//
clsl_ItmMin = 100					// in A
clsl_ItmMax = 1500					// in A
//
clsl_IgMin = 100;					// in mA
clsl_IgMax = 1000;					// in mA
//
clsl_UgMin = 1000;					// in mV
clsl_UgMax = 11000;					// in mV
//
clsl_UseAvg = 0;

// Counters
clsl_CntTotal = 0;
clsl_CntDone = 0;

// Channels
clsl_chMeasureI = 1;
clsl_chMeasureU = 2;
clsl_chSync = 3;

clsl_ShuntRes = 0;		// in mOhms (read from block)
clsl_ForceShuntRes = 0;	// force shunt resistance (in mOhms)
// DUT resistance
clsl_DUTRes = 1;			// in mOhms
clsl_DUTConst = 0;		// in mV
//
clsl_UseAvg = 1;
clsl_UseRangeTuning = 1;
//
clsl_lsl_Enable = 1;
clsl_lsl_RangeI = 1;

// Current ranges
// 
// Calibrate I 
clsl_Imin = 300;			// in A
clsl_Imax = 4000;		// in A
clsl_Istp = 250;			// in A

clsl_ImaxV = 0;			// in A 

// Calibrate V
clsl_Vmax = 4000;
clsl_Vfsmax = 3500;

// Counters
clsl_cntTotal = 0;
clsl_cntDone = 0;

// Arrays
// Results storage
clsl_Utm = [];
clsl_Itm = [];
clsl_Iset = [];
clsl_Ig = [];
clsl_IgSet = [];
clsl_Ug = [];
clsl_UgSet = [];

clsl_v = [];
clsl_i = [];
clsl_i_set = [];

// Tektronix data
clsl_UtmSc = [];
clsl_ItmSc = [];
clsl_IsetSc = [];
clsl_IgSc = [];
clsl_UgSc = [];

clsl_v_sc = [];
clsl_i_sc = [];

// Relative error
clsl_UtmErr = [];
clsl_ItmErr = [];
clsl_IsetErr = [];
clsl_IgErr = [];
clsl_IgSetErr = [];
clsl_UgErr = [];
clsl_UgSetErr = [];

clsl_v_err = [];
clsl_i_err = [];
clsl_iset_err = [];

// Correction
clsl_UtmCorr = [];
clsl_ItmCorr = [];
clsl_IsetCorr = [];
clsl_IgCorr = [];
clsl_IgSetCorr = [];
clsl_UgCorr = [];
clsl_UgSetCorr = [];

clsl_v_corr = [];
clsl_i_corr = [];
clsl_iset_corr = [];

// Summary error
clsl_v_err_sum = [];
clsl_i_err_sum = [];
clsl_iset_err_sum = [];

clsl_chMeasureV = 1;

// Iterations
clsl_Iterations = 1;

// Measurement errors
clsl_EUosc = 3;
clsl_ER = 1;
clsl_E0 = 0;

clsl_PWM = false;


// general
function CLSL_Init(portDevice, portTek, channelMeasureI, channelMeasureU, channelSyncTrigger)
{
	// Version check
	for (var i = 0; i < 5; i++)
	{
		if (dev.r(i) !== 0)
		{
			clsl_PWM = false;
			break;
		}
		clsl_PWM = true;
	}

	if (channelMeasureU < 1 || channelMeasureU > 4 ||
		channelMeasureI < 1 || channelMeasureI > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Init device port
	dev.Disconnect();
	dev.co(portDevice);

	// Copy channel information
	clsl_chMeasureU = channelMeasureU;
	clsl_chMeasureI = channelMeasureI;

	if (!clsl_PWM)
		clsl_chSync = channelSyncTrigger;

	// Init Tektronix port
	TEK_PortInit(portTek);
	
	TEK_ChannelInit(clsl_chMeasureI, "1", "1");
	TEK_ChannelInit(clsl_chMeasureU, "1", "1");
	TEK_ChannelInit(clsl_chSyncTrigger, "1", clsl_PWM ? "0.5" : "1");

	if (!clsl_PWM)
		CLSL_TriggerInit(clsl_chSyncTrigger);
	else
	{
		TEK_TriggerInit(channelSyncTrigger, "0.5");
		TEK_Send("trigger:main:edge:slope fall");
		TEK_Horizontal("2.5e-3", "0");
	}

	// Tektronix init
	for (var i = 1; i <= 4; i++)
	{
		if ((i == clsl_chMeasureU) || (i == channelMeasureI) || (i == clsl_chSync))
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}

	if (clsl_PWM)
	{
		// Init measurement
		CLSL_TekCursor(csl_chMeasureU);
		CLSL_TekCursor(csl_chMeasureI);
	}
}

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

	clsl_v = [];
	clsl_i = [];
	clsl_i_set = [];

	// Tektronix data
	clsl_UtmSc = [];
	clsl_ItmSc = [];
	clsl_IsetSc = [];
	clsl_IgSc = [];
	clsl_UgSc = [];

	clsl_v_sc = [];
	clsl_i_sc = [];

	// Relative error
	clsl_UtmErr = [];
	clsl_ItmErr = [];
	clsl_IsetErr = [];
	clsl_IgErr = [];
	clsl_IgSetErr = [];
	clsl_UgErr = [];
	clsl_UgSetErr = [];

	clsl_v_err = [];
	clsl_i_err = [];
	clsl_iset_err = [];

	// Correction
	clsl_UtmCorr = [];
	clsl_ItmCorr = [];
	clsl_IsetCorr = [];
	clsl_IgCorr = [];
	clsl_IgSetCorr = [];
	clsl_UgCorr = [];
	clsl_UgSetCorr = [];

	clsl_v_corr = [];
	clsl_i_corr = [];
	clsl_iset_corr = [];

	// Summary error
	clsl_v_err_sum = [];
	clsl_i_err_sum = [];
	clsl_iset_err_sum = [];
}

function CLSL_CalibrateIset()
{
	CLSL_ResetA();
	CLSL_ResetIsetCal();

	if (clsl_PWM)
	{
		// Configure
		dev.w(162, 1);
		var CurrentArray = CGEN_GetRange(csl_Imin, csl_Imax, csl_Istp);

		if (CSL_Collect(CurrentArray, 0, csl_Iterations))
		{
			CSL_SaveIset("sl_iset");

			// Plot relative error distribution
			scattern(csl_i_set, csl_iset_err, "Current (in A)", "Error (in %)", "Current setpoint relative error");

			// Calculate correction
			csl_iset_corr = CGEN_GetCorrection2("sl_iset");
			CSL_CalISet(csl_iset_corr[0], csl_iset_corr[1], csl_iset_corr[2]);

			// Print correction
			CSL_PrintIsetCal();
		}
	}
	else
	{
		OverShootCurrentReset();

		// Tektronix init
		if(clsl_measuring_device == "TPS2000")
			CLSL_TekInit(clsl_chMeasureI);
		else if (clsl_measuring_device == "DMM6000")
		{
			KEI_ConfigVoltage(clsl_V_PulsePlate);
			KEI_ConfigExtTrigger(clsl_V_TriggerDelay);
		}

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
}

function CLSL_VerifyIset()
{
	CLSL_ResetA();
	
	if (clsl_PWM)
	{
		// Reload values
		dev.w(162, 1);
		var CurrentArray = CGEN_GetRange(csl_Imin, csl_Imax, csl_Istp);

		if (CSL_Collect(CurrentArray, 0, csl_Iterations))
		{
			CSL_SaveI("sl_iset_fixed");

			// Plot relative error distribution
			scattern(csl_i_set, csl_iset_err, "Current (in A)", "Error (in %)", "Current setpoint relative error");

			// Plot summary error distribution
			scattern(csl_i_set, csl_iset_err_sum, "Current (in A)", "Error (in %)", "Current setpoint summary error");
		}
	}
	else
	{
		OverShootCurrentReset();

		// Tektronix init
		if(clsl_measuring_device == "TPS2000")
			CLSL_TekInit(clsl_chMeasureI);
		else if (clsl_measuring_device == "DMM6000")
		{
			KEI_ConfigVoltage(clsl_V_PulsePlate);
			KEI_ConfigExtTrigger(clsl_V_TriggerDelay);
		}

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
}

function CLSL_TekCursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send(clsl_PWM ? "cursor:vbars:position1 -5e-3" : "cursor:vbars:position1 0");
	TEK_Send("cursor:vbars:position2 0");
}

function CLSL_TekScale(Channel, Value)
{
	if (clsl_PWM)
	{
		TEK_ChannelScale(Channel, Value);
	}
	else
	{
		// 0.9 - use 90% of full range
		// 8 - number of scope grids in full scale
		var scale = (Value / (8 * 0.9));
		TEK_Send("ch" + Channel + ":scale " + scale);
	}
}

function CLSL_SaveIset(NameIset)
{
	CGEN_SaveArrays(NameIset, clsl_IsetSc, clsl_Iset, clsl_IsetErr);
}

function CLSL_ResetIsetCal()
{
	CLSL_CalIset(0, 1, 0);
}

function CLSL_CalIset(P2, P1, P0)
{
	if (clsl_PWM)
	{
		if (csl_lsl_Enable)
		{
			dev.ws(11, Math.round(P2 * 1e6));
			dev.w (12, Math.round(P1 * 1000));
			dev.ws(13, Math.round(P0 * 10));
		}
		else
		{
			dev.ws(77, Math.round(P2 * 1e6));
			dev.w (78, Math.round(P1 * 1000));
			dev.ws(79, Math.round(P0));
		}
	}
	else
	{
		dev.ws(43, Math.round(P2 * 1e6));
		dev.w(42, Math.round(P1 * 1000));
		dev.ws(41, Math.round(P0));
	}
}

// SL



// LSLH



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
