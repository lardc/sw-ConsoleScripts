include("TestATU.js")
include("Tektronix.js")
include("CalGeneral.js")


// Input params
catu_LoadType	= 2;			// Load Type: 1-DUT; 2-Resistor;
catu_LoadR		= 1156;			// Load Resistance (in Ohms)
catu_Vmax		= 9000;			// Max output voltage (in V)
catu_Power		= 75000;		// Max output power (in W)
catu_LoadV		= 0;			// Fixed extra voltage for DUT (in V)
catu_preCurrent	= 150;			// Pre-current plate (in mA)
catu_ShuntRes	= 0.05;			// Current shunt resistanse (in Ohms)


// Select software
catu_new_soft = 1;

// Calibrate I limits (in mA)
catu_Imin = 1000;
// catu_Imax is automatically calculated from MaxVoltage or MaxPower and resistance
catu_Istp = 1000;

// Verify P limits (in W)
catu_Pmin = 2000;
// catu_Pmax is equal catu_Power
catu_Pstp = 7000;

// Automatic selection of the maximum current limit for calibration
catu_high_current = 0;

// Counters
catu_cntTotal = 0;
catu_cntDone = 0;

// Iterations
catu_Iterations = 3;

// Channels
catu_chMeasureV = 1;
catu_chMeasureI = 2;

/////////////////////////
// Measurement errors
EUosc = 3;
Esh = 2;
Ediv = 0;
////////////////////////

// Results storage
catu_v = [];
catu_i = [];
catu_p = [];
catu_i_set = [];
catu_p_set = [];

// Tektronix data
catu_v_sc = [];
catu_i_sc = [];
catu_p_sc = [];

// Relative error
catu_v_err = [];
catu_i_err = [];
catu_p_err = [];
catu_iset_err = [];
catu_pset_err = [];

// Correction
catu_v_corr = [];
catu_i_corr = [];



function CATU_CalibrateI()
{
	// Prepare variables
	catu_high_current = 1;
	var CurrentArray = CATU_GetCurrentRange();

	if (!Array.isArray(CurrentArray))
		return;

	CATU_ResetA();
	CATU_ResetCalI();

	if (CATU_Collect(CurrentArray, catu_Iterations))
	{
		CATU_SaveI("atuhp_i");
		CATU_SaveIset("atuhp_iset");

		// Plot relative error distribution
		scattern(catu_i_sc, catu_i_err, "Current (in A)", "Error (in %)", "Current relative error"); sleep(200);
		scattern(catu_i_set, catu_iset_err, "Current (in A)", "Error (in %)", "Current setpoint relative error");

		// Calculate correction
		catu_i_corr = CGEN_GetCorrection2("atuhp_i");
		CATU_CalI2(catu_i_corr[0], catu_i_corr[1], catu_i_corr[2]);

		CATU_PrintCalI();
	}
}

// High Load
function CATU_CalibrateV()
{
	// Prepare variables
	catu_high_current = 0;
	var CurrentArray = CATU_GetCurrentRange();
	if (!Array.isArray(CurrentArray))
		return;

	CATU_ResetA();
	CATU_ResetCalV();

	if (CATU_Collect(CurrentArray, catu_Iterations))
	{
		CATU_SaveV("atuhp_v");

		// Plot relative error distribution
		scattern(catu_v_sc, catu_v_err, "Voltage (in V)", "Error (in %)", "Voltage relative error");

		// Calculate correction
		catu_v_corr = CGEN_GetCorrection2("atuhp_v");
		CATU_CalV2(catu_v_corr[0], catu_v_corr[1], catu_v_corr[2]);

		CATU_PrintCalV();
	}
}

function CATU_VerifyI()
{
	// Prepare variables
	catu_high_current = 1;
	var CurrentArray = CATU_GetCurrentRange();

	if (!Array.isArray(CurrentArray))
		return;

	CATU_ResetA();

	if (CATU_Collect(CurrentArray, catu_Iterations))
	{
		CATU_SaveI("atuhp_i_fixed");
		CATU_SaveIset("atuhp_iset_fixed");

		// Plot relative error distribution
		scattern(catu_i_sc, catu_i_err, "Current (in A)", "Error (in %)", "Current relative error"); sleep(200);
		scattern(catu_i_set, catu_iset_err, "Current (in A)", "Error (in %)", "Current setpoint relative error");
	}
}

function CATU_VerifyV()
{
	// Prepare variables
	catu_high_current = 0;
	var CurrentArray = CATU_GetCurrentRange();
	if (!Array.isArray(CurrentArray))
		return;

	CATU_ResetA();

	if (CATU_Collect(CurrentArray, catu_Iterations))
	{
		CATU_SaveV("atuhp_v_fixed");

		// Plot relative error distribution
		scattern(catu_v_sc, catu_v_err, "Voltage (in V)", "Error (in %)", "Voltage relative error");
	}
}

function CATU_VerifyP()
{
	// Prepare variables
	catu_high_current = 0;
	var PowerArray = CGEN_GetRange(catu_Pmin, catu_Power, catu_Pstp);

	CATU_ResetA();

	if (CATU_CollectP(PowerArray, catu_Iterations))
	{
		CATU_SaveP("atuhp_p_fixed");
		CATU_SavePset("atuhp_pset_fixed");

		// Plot relative error distribution for power
		scattern(catu_p_sc, catu_p_err, "Power (in W)", "Error (in %)", "Power relative error"); sleep(200);
		scattern(catu_p_set, catu_pset_err, "Power (in W)", "Error (in %)", "Power setpoint relative error"); sleep(200);
		scattern(catu_p_set, catu_p_counter, "Power (in W)", "REG_COUNTER_MEASURE", "The number of pulses for the set power");
	}
}

function CATU_GetCurrentRange()
{
	if (catu_LoadType == 1)
	{
		if (catu_LoadV == 0)
		{
			print("Error. Undefined fixed DUT voltage.");
			return;
		}
		
		// For DUT
		catu_Imax = Math.round(1000 * catu_Power / catu_LoadV);
	}
	else if (catu_LoadType == 2)
	{
		// For resistor
		var I_v = Math.round(1000 * catu_Vmax / catu_LoadR);
		var I_p = Math.round(1000 * Math.sqrt(catu_Power / catu_LoadR));
		if (catu_high_current == 1)
			catu_Imax = 45000; // Для калибровки/верификации тока
		else
			catu_Imax = (I_v < I_p) ? I_v : I_p; // Для калибровки/верификации напряжения и мощности

	}
	else
	{
		print("Error. Unknown load type.");
		return;
	}
	
	return CGEN_GetRange(catu_Imin, catu_Imax, catu_Istp);
}

function CATU_Init(portATU, portTek, channelMeasureV, channelMeasureI, channelMeasureS)
{
	if (channelMeasureV < 1 || channelMeasureV > 4 ||
		channelMeasureI < 1 || channelMeasureI > 4 ||
		channelMeasureS < 1 || channelMeasureS > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	catu_chMeasureV = channelMeasureV;
	catu_chMeasureI = channelMeasureI;
	catu_chMeasureS = channelMeasureS;

	// Init ATU
	dev.Disconnect();
	dev.Connect(portATU);

	// Init Tektronix
	TEK_PortInit(portTek);

	// Tektronix init
	// Init channels
	TEK_ChannelInvInit(catu_chMeasureV, "1000", "500");
	TEK_ChannelInvInit(catu_chMeasureI, "1", "0.2");
	TEK_ChannelInit(catu_chMeasureS, "1", "1");
	// Init trigger
	TEK_TriggerPulseExtendedInit(channelMeasureS, "3.5", "dc", "1e-3", "negative", "inside");
	// Horizontal settings
	TEK_Horizontal("25e-6", "0e-6");
	// Init Sample mode
	TEK_AcquireSample();
	// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == catu_chMeasureV || i == catu_chMeasureI || i == catu_chMeasureS)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
	TEK_ForceTrig();

	// Init measurement
	CATU_TekMeasurement(catu_chMeasureV);
	CATU_TekMeasurement(catu_chMeasureI);
}

function CATU_Collect(CurrentValues, IterationsCount)
{
	catu_cntTotal = IterationsCount * CurrentValues.length;
	catu_cntDone = 1;

	// Power-up check
	if (dev.r(96) != 4)
	{
		print("Error. Device is not powered up.");
		return 0;
	}

	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			print("-- result " + catu_cntDone++ + " of " + catu_cntTotal + " --");

			TEK_ForceTrig();
			CATU_TekScale(catu_chMeasureV, CurrentValues[j] * catu_LoadR / 1000 + catu_LoadV);
			CATU_TekScale(catu_chMeasureI, CurrentValues[j] * catu_ShuntRes / 1000);
			sleep(1000);
			
			catu_i_set.push(CurrentValues[j]);
			print("Iset,    A: " + (CurrentValues[j] / 1000).toFixed(2));
			print("---------")
			
			var atu_print_copy = atu_print;
			atu_print = 1;
			var UnitData = ATU_Pulse(catu_preCurrent, CurrentValues[j]);
			atu_print = atu_print_copy;
			while (_ATU_Active()) sleep(100);

			// Save unit data
			catu_v.push(UnitData.V);
			catu_i.push(UnitData.I);
			sleep(2000);

			// Scope data
			var v_sc = CATU_MeasureV();
			var i_sc = CATU_MeasureI();
			var p_sc = Math.round(v_sc * i_sc / 1000);
			catu_v_sc.push(v_sc);
			catu_i_sc.push(i_sc);
			print("Utek,    V: " + v_sc);
			print("Погр изм. U,  %: " + ((dev.r(110) - v_sc) / v_sc * 100).toFixed(2));
			print("Itek,   A: " + (i_sc / 1000).toFixed(2));
			print("Погр зад. I,  %: " + ((i_sc - CurrentValues[j]) / CurrentValues[j] * 100).toFixed(2));
			print("Погр изм. I,  %: " + ((dev.r(111) - i_sc) / i_sc * 100).toFixed(2));
			
			print("Ptek,   kW: " + (p_sc / 1000).toFixed(2));




			// Relative error
			catu_v_err.push(((UnitData.V - v_sc) / v_sc * 100).toFixed(2));
			catu_i_err.push(((UnitData.I - i_sc) / i_sc * 100).toFixed(2));
			////////////////////////////////////////////////////////////////
			// Summary error
			//catu_v_err.push(1.1 * Math.sqrt(Math.pow((UnitData.V - v_sc)/v_sc * 100, 2) + Math.pow(EUosc, 2) + Math.pow(Ediv, 2));
			//catu_i_err.push(1.1 * Math.sqrt(Math.pow((UnitData.I - i_sc)/i_sc * 100, 2) + Math.pow(EUosc, 2) + Math.pow(Esh, 2));
			////////////////////////////////////////////////////////////////
			catu_iset_err.push(((i_sc - CurrentValues[j]) / CurrentValues[j] * 100).toFixed(2));
			////////////////////////////////////////////////////////////////
			for(var k = 0; k < catu_p_err.length; k++)
			{
				catu_p_err[k] = catu_v_err[k] + catu_i_err[k];
			}
			////////////////////////////////////////////////////////////////
			print("------------------------");
			sleep(1000);
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CATU_CollectP(PowerValues, IterationsCount)
{
	catu_cntTotal = IterationsCount * PowerValues.length;
	catu_cntDone = 1;

	// Power-up check
	if (dev.r(96) != 4)
	{
		print("Error. Device is not powered up.");
		return 0;
	}

	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < PowerValues.length; j++)
		{
			print("-- result " + catu_cntDone++ + " of " + catu_cntTotal + " --");

			TEK_ForceTrig();
			var vals = CATU_PowerToVI(PowerValues[j]);
			
			CATU_TekScale(catu_chMeasureV, vals.voltage);
			CATU_TekScale(catu_chMeasureI, vals.current * catu_ShuntRes);
			sleep(1000);
			
			catu_p_set.push(PowerValues[j]);
			print("Pset,    W: " + PowerValues[j]);
			print("---------")
			
			var atu_print_copy = atu_print;
			atu_print = 1;
			var UnitData = ATU_StartPower(catu_preCurrent, PowerValues[j]);
			atu_print = atu_print_copy;
			while (_ATU_Active()) sleep(100);

			// Save unit data
			catu_p.push(UnitData.P);
			catu_p_counter.push(dev.r(105));
			sleep(2000);

			// Scope data
			var v_sc = CATU_MeasureV();
			var i_sc = CATU_MeasureI();
			var p_sc = Math.round(v_sc * i_sc / 1000);
			catu_p_sc.push(p_sc);
			print("Utek,    V: " + v_sc);
			print("Itek,   mA: " + (i_sc / 1000).toFixed(2));
			print("Ptek,   kW: " + (p_sc / 1000).toFixed(2));

			print("Погр зад. W,  %: " + ((p_sc - PowerValues[j]) / PowerValues[j] * 100).toFixed(2));
			print("Погр изм. W,  %: " + ((UnitData.P - p_sc) / p_sc * 100).toFixed(2));

			// Relative error
			catu_p_err.push(((UnitData.P - p_sc) / p_sc * 100).toFixed(2));
			catu_pset_err.push(((p_sc - PowerValues[j]) / PowerValues[j] * 100).toFixed(2));
			
			print("------------------------");
			sleep(1000);
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CATU_PowerToVI(Power)
{
	var voltage = 0, current = 0;
	
	if (catu_LoadType == 1)
	{
		// ток определяется из квадратного уравнения
		// U = U0 + I * R;
		// P = U * I = I^2 * R + U0 * I
		// I^2 * R + U0 * I - P = 0
		
		current = (-catu_LoadV + Math.sqrt(catu_LoadV * catu_LoadV + 4 * catu_LoadR * Power)) / (2 * catu_LoadR);
		voltage = catu_LoadV + current * catu_LoadR;
	}
	else if (catu_LoadType == 2)
	{
		current = Math.sqrt(Power / catu_LoadR);
		voltage = Power / current;
	}
	else
	{
		print("Error. Unknown load type.");
		return;
	}
	
	return {voltage:voltage, current:current};
}

function CATU_TekMeasurement(Channel)
{
	TEK_Send("measurement:meas" + Channel + ":source ch" + Channel);
	TEK_Send("measurement:meas" + Channel + ":type maximum");
}

function CATU_TekScale(Channel, Value)
{
	// 0.8 - use 80% of full range
	// 8 - number of scope grids in full scale
	var scale = (Value / (8 * 0.8));
	TEK_Send("ch" + Channel + ":scale " + scale);
}

function CATU_MeasureV()
{
	var f = TEK_Measure(catu_chMeasureV);
	if (Math.abs(f) > 2e+4)
		f = 0;
	return Math.round(f);
}

function CATU_MeasureI()
{
	var f = TEK_Measure(catu_chMeasureI);
	if (Math.abs(f) > 2e+4)
		f = 0;
	return Math.round(f / catu_ShuntRes * 1000);
}

function CATU_PrintCalI()
{
	if (catu_new_soft)
	{
		print("I P2 x1e6:	" + dev.rs(16));
		print("I P1 x1000:	" + dev.r(15));
		print("I P0:		" + dev.rs(14));
	}
	else
	{
		print("I P2 x1e6:	" + dev.rs(17));
		print("I P1 x1000:	" + (dev.r(14) / dev.r(15)));
		print("I P0:		" + dev.rs(13));
	}
}

function CATU_PrintCalV()
{
	if (catu_new_soft)
	{
		print("U P2 x1e6:	" + dev.rs(11));
		print("U P1 x1000:	" + dev.r(10));
		print("U P0:		" + dev.rs(9));
	}
	else
	{
		print("U P2 x1e6:	" + dev.rs(16));
		print("U P1 x1000:	" + (dev.r(11) / dev.r(12)));
		print("U P0:		" + dev.rs(10));
	}
}

function CATU_ResetA()
{
	// Results storage
	catu_v = [];
	catu_i = [];
	catu_p = [];
	catu_p_counter = [];
	catu_i_set = [];
	catu_p_set = [];

	// Tektronix data
	catu_v_sc = [];
	catu_i_sc = [];
	catu_p_sc = [];

	// Relative error
	catu_v_err = [];
	catu_i_err = [];
	catu_p_err = [];
	catu_iset_err = [];
	catu_pset_err = [];

	// Correction
	catu_v_corr = [];
	catu_i_corr = [];
}

function CATU_SaveV(NameV)
{
	CGEN_SaveArrays(NameV, catu_v, catu_v_sc, catu_v_err);
}

function CATU_SaveI(NameI)
{
	CGEN_SaveArrays(NameI, catu_i, catu_i_sc, catu_i_err);
}

function CATU_SaveP(NameP)
{
	CGEN_SaveArrays(NameP, catu_p, catu_p_sc, catu_p_err);
}

function CATU_SaveIset(NameIset)
{
	CGEN_SaveArrays(NameIset, catu_i, catu_i_set, catu_iset_err);
}

function CATU_SavePset(NamePset)
{
	CGEN_SaveArrays(NamePset, catu_p, catu_p_set, catu_pset_err);
}

function CATU_ResetCalV()
{
	CATU_CalV2(0, 1, 0);
}

function CATU_ResetCalI()
{
	CATU_CalI2(0, 1, 0);
}

function CATU_CalV2(P2, P1, P0)
{
	if (catu_new_soft)
	{
		dev.ws(11, Math.round(P2 * 1e6));
		dev.w (10, Math.round(P1 * 1000));
		dev.ws(9,  Math.round(P0));
	}
	else
	{
		dev.ws(16, Math.round(P2 * 1e6));
		dev.w(11, Math.round(P1 * 1000));
		dev.w(12, 1000);
		dev.ws(10, Math.round(P0));
	}
}

function CATU_CalI2(P2, P1, P0)
{
	if (catu_new_soft)
	{
		dev.ws(16, Math.round(P2 * 1e6));
		dev.w (15, Math.round(P1 * 1000));
		dev.ws(14, Math.round(P0));
	}
	else
	{
		dev.ws(17, Math.round(P2 * 1e6));
		dev.w(14, Math.round(P1 * 1000));
		dev.w(15, 1000);
		dev.ws(13, Math.round(P0));
	}
}
