include("TestATU.js")
include("Tektronix.js")
include("CalGeneral.js")

// --- Input params
loadType = 2; 			// Load Type: 1-DUT; 2-Resistor;
catu_load = 1100;		// Load Resistance [Ohm]
catu_Vmax = 6000;		// MAX OUT Voltage [V]
catu_Power = 30000;		// MAX Power [W]


// Calibrate I
catu_Imin = 1000;
catu_Imax = Math.round(1000*catu_Vmax/catu_load);
catu_Istp = 500;

// Verify P
catu_Pmin = 2000;
catu_Pmax = catu_Power;
catu_Pstp = 3000;

// Counters
catu_cntTotal = 0;
catu_cntDone = 0;

// Iterations
catu_Iterations = 2;

// Start values
catu_voltageScale = 3000;
catu_preCurrent = 150;

// Channels
catu_chMeasureV = 1;
catu_chMeasureI = 2;

catu_i_array = [];

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
catu_pset_err = [];
catu_iset_err = [];

// Correction
catu_v_corr = [];
catu_i_corr = [];

//
catu_UseAvg = 0;
//
catu_rep = 1;


function CATU_SetI(min, max, step)
{
	catu_Imin = min;
	catu_Imax = max;
	catu_Istp = step;
}

// Low Load
function CATU_CalibrateI()
{
	// Collect data
	CATU_ResetA();
	CATU_ResetCal();
	
	catu_Imin = 1000;
	if (loadType == 1)
	{
		catu_Imax = Math.round(1000*catu_Power/2500);
	}
	else
	{
	if (Math.round(1000*catu_Vmax/catu_load) < Math.round(1000*Math.sqrt(catu_Power/catu_load)))
		{catu_Imax = Math.round(1000*catu_Vmax/catu_load);}
	else
		{catu_Imax = Math.round(1000*Math.sqrt(catu_Power/catu_load));}
	}
	catu_Istp = 500;

	// Reload values
	var CurrentArray = CGEN_GetRange(catu_Imin, catu_Imax, catu_Istp);

	if (CATU_Collect(CurrentArray, catu_Iterations))
	{
		CATU_SaveI("atu_i");
		CATU_SaveP("atu_p");
		CATU_SaveIset("atu_iset");

		// Plot relative error distribution
		scattern(catu_i_sc, catu_i_err, "Current (in A)", "Error (in %)", "Current relative error"); sleep(200);
		scattern(catu_p_sc, catu_p_err, "Power (in W)", "Error (in %)", "Power relative error"); sleep(200);
		scattern(catu_i_set, catu_iset_err, "Current (in mA)", "Error (in %)", "Current setpoint relative error");

		if (CGEN_UseQuadraticCorrection())
		{
			// Calculate correction
			catu_i_corr = CGEN_GetCorrection2("atu_i");
			CATU_CalI2(catu_i_corr[0], catu_i_corr[1], catu_i_corr[2]);
			print("Coefs I:");
			print(catu_i_corr[0]);
			print(catu_i_corr[1]);
			print(catu_i_corr[2]);
			print("--------------");
		}
		else
		{
			// Calculate correction
			catu_i_corr = CGEN_GetCorrection("atu_i");
			CATU_CalI(catu_i_corr[0], catu_i_corr[1]);
			print("Coefs I:");
			print(catu_i_corr[0]);
			print(catu_i_corr[1]);
			print("--------------");
		}
		// Print correction
		//CATU_PrintCal();
	}
}

// High Load
function CATU_CalibrateV()
{
	// Collect data
	CATU_ResetA();
	CATU_ResetCal();
	
	catu_Imin = 1000;
	if (loadType == 1)
	{
		catu_Imax = Math.round(1000*catu_Power/2500);
	}
	else
	{
	if (Math.round(1000*catu_Vmax/catu_load) < Math.round(1000*Math.sqrt(catu_Power/catu_load)))
		{catu_Imax = Math.round(1000*catu_Vmax/catu_load);}
	else
		{catu_Imax = Math.round(1000*Math.sqrt(catu_Power/catu_load));}
	}
	catu_Istp = 500;

	// Reload values
	var CurrentArray = CGEN_GetRange(catu_Imin, catu_Imax, catu_Istp);

	if (CATU_Collect(CurrentArray, catu_Iterations))
	{
		CATU_SaveV("atu_v");
		CATU_SaveP("atu_p");
		CATU_SaveIset("atu_iset");

		// Plot relative error distribution
		scattern(catu_v_sc, catu_i_err, "Voltage (in V)", "Error (in %)", "Voltage relative error"); sleep(200);
		scattern(catu_p_sc, catu_p_err, "Power (in W)", "Error (in %)", "Power relative error"); sleep(200);
		scattern(catu_i_set, catu_iset_err, "Current (in mA)", "Error (in %)", "Current setpoint relative error");

		if (CGEN_UseQuadraticCorrection())
		{
			// Calculate correction
			catu_v_corr = CGEN_GetCorrection2("atu_v");
			CATU_CalV2(catu_v_corr[0], catu_v_corr[1], catu_v_corr[2]);
			print("Coefs V:");
			print(catu_v_corr[0]);
			print(catu_v_corr[1]);
			print(catu_v_corr[2]);
			print("--------------");
		}
		else
		{
			// Calculate correction
			catu_v_corr = CGEN_GetCorrection("atu_v");
			CATU_CalV(catu_v_corr[0], catu_v_corr[1]);
			print("Coefs V:");
			print(catu_v_corr[0]);
			print(catu_v_corr[1]);
			print("--------------");
		}
		// Print correction
		//CATU_PrintCal();
	}
}

function CATU_VerifyP()
{
	// Collect data
	CATU_ResetA();

	var PowerArray = CGEN_GetRange(catu_Pmin, catu_Pmax, catu_Pstp);

	if (CATU_CollectP(PowerArray, catu_Iterations))
	{
		CATU_SaveI("atu_i_fixed");
		CATU_SaveV("atu_v_fixed");
		CATU_SaveP("atu_p_fixed");
		CATU_SavePset("atu_pset_fixed");

		// Plot relative error distribution I
		scattern(catu_i_sc, catu_i_err, "Current (in A)", "Error (in %)", "Current relative error"); sleep(200);
		// Plot relative error distribution V
		scattern(catu_v_sc, catu_v_err, "Voltage (in V)", "Error (in %)", "Voltage relative error"); sleep(200);
		// Plot relative error distribution P
		scattern(catu_p_sc, catu_p_err, "Power (in W)", "Error (in %)", "Power relative error"); sleep(200);
		//scattern(catu_p_set, catu_pset_err_err, "Power (in W)", "Error (in %)", "Power setpoint relative error");
	}
}

function CATU_Verify()
{
	// Collect data
	catu_Imin = 1000;
	if (loadType == 1)
	{
		catu_Imax = Math.round(1000*catu_Power/2500);
	}
	else
	{
	if (Math.round(1000*catu_Vmax/catu_load) < Math.round(1000*Math.sqrt(catu_Power/catu_load)))
		{catu_Imax = Math.round(1000*catu_Vmax/catu_load);}
	else
		{catu_Imax = Math.round(1000*Math.sqrt(catu_Power/catu_load));}
	}
	catu_Istp = 500;

	var CurrentArray = CGEN_GetRange(catu_Imin, catu_Imax, catu_Istp);

	if (CATU_Collect(CurrentArray, catu_Iterations))
	{
		CATU_SaveI("atu_i_fixed");
		CATU_SaveV("atu_v_fixed");
		CATU_SaveP("atu_p_fixed");
		CATU_SavePset("atu_pset_fixed");

		// Plot relative error distribution I
		scattern(catu_i_sc, catu_i_err, "Current (in A)", "Error (in %)", "Current relative error"); sleep(200);
		// Plot relative error distribution V
		scattern(catu_v_sc, catu_v_err, "Voltage (in V)", "Error (in %)", "Voltage relative error"); sleep(200);
		// Plot relative error distribution P
		scattern(catu_p_sc, catu_p_err, "Power (in W)", "Error (in %)", "Power relative error"); sleep(200);
		//scattern(catu_p_set, catu_pset_err_err, "Power (in W)", "Error (in %)", "Power setpoint relative error");
	}
}

function CATU_Init(portATU, portTek, channelMeasureV, channelMeasureI)
{
	if (channelMeasureV < 1 || channelMeasureV > 4 ||
		channelMeasureI < 1 || channelMeasureI > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	catu_chMeasureV = channelMeasureV;
	catu_chMeasureI = channelMeasureI;

	// Init ATU
	dev.Disconnect();
	dev.Connect(portATU);

	// Init Tektronix
	TEK_PortInit(portTek);

	// Tektronix init
	// Init channels
	TEK_ChannelInvInit(catu_chMeasureV, "1000", "500");
	TEK_ChannelInvInit(catu_chMeasureI, "1", "0.5");
	// Init trigger
	TEK_TriggerInit(catu_chMeasureI, "-1");
	// Horizontal settings
	TEK_Horizontal("50e-6", "-75e-6");

	// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == catu_chMeasureV || i == catu_chMeasureI)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}

	// Init measurement
	CATU_TekMeas(catu_chMeasureV);
	CATU_TekMeas(catu_chMeasureI);
}

function CATU_Collect(CurrentValues, IterationsCount)
{
	catu_cntTotal = IterationsCount * CurrentValues.length;
	catu_cntDone = 1;

	var AvgNum;

	if (catu_UseAvg)
	{
		AvgNum = 4;
		TEK_AcquireAvg(AvgNum);
	}
	else
	{
		AvgNum = 1;
		TEK_AcquireSample();
	}

	// Power-up
	if (dev.r(96) == 0) dev.c(1);
	while (dev.r(96) == 0) sleep(100);
	if (dev.r(96) != 4)
	{
		print("Power-up error");
		return 0;
	}
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			print("-- result " + catu_cntDone++ + " of " + catu_cntTotal + " --");
			
			CATU_TekScale(catu_chMeasureV, (CurrentValues[j]) * (1e-3) * catu_load);
			CATU_TekScale(catu_chMeasureI, (CurrentValues[j]*1.1) * (1e-4));					// I
			TEK_TriggerInit(catu_chMeasureI, -(CurrentValues[j]) * (8e-5));
			
			sleep(1500);

			catu_i_set.push(CurrentValues[j]);

			atu_print = 0;
			atu_rep = catu_rep;
			
			ATU_Pulse(catu_preCurrent, CurrentValues[j]);
			atu_print = 1;
			while (dev.r(96) == 3) sleep(500);

			// Unit data
			var v_read = dev.r(110);
			var i_read = dev.r(111);
			var p_read = dev.r(112);
			catu_v.push(v_read);
			catu_i.push(i_read);
			catu_p.push(p_read);
			print("V,  V: " + v_read);
			print("I, mA: " + i_read);
			print("P,  W: " + p_read);
			sleep(1000);
			
			// Scope data
			var v_sc = Math.round(CATU_Measure(catu_chMeasureV, 3), 3);
			var i_sc = Math.round(CATU_Measure(catu_chMeasureI, 4)*10000, 3);
			var p_sc = Math.round(v_sc * i_sc * (1e-3), 3);
			catu_v_sc.push(v_sc);
			catu_i_sc.push(i_sc);
			catu_p_sc.push(p_sc);
			print("Vtek,  V: " + v_sc);
			print("Itek, mA: " + i_sc);
			print("Ptek,  W: " + p_sc);

			// Relative error
			catu_v_err.push(((v_read - v_sc) / v_sc * 100).toFixed(2));
			catu_i_err.push(((i_read - i_sc) / i_sc * 100).toFixed(2));
			catu_p_err.push(((p_read - p_sc) / p_sc * 100).toFixed(2));
			catu_iset_err.push(((i_read - CurrentValues[j]) / CurrentValues[j] * 100).toFixed(2));

			sleep(1000);

			print("-------------------------------");
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CATU_CollectP(PowerValues, IterationsCount)
{
	catu_cntTotal = IterationsCount * PowerValues.length;
	catu_cntDone = 1;

	var AvgNum;

	if (catu_UseAvg)
	{
		AvgNum = 4;
		TEK_AcquireAvg(AvgNum);
	}
	else
	{
		AvgNum = 1;
		TEK_AcquireSample();
	}

	// Power-up
	if (dev.r(96) == 0) dev.c(1);
	while (dev.r(96) == 0) sleep(100);
	if (dev.r(96) != 4)
	{
		print("Power-up error");
		return 0;
	}

	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < PowerValues.length; j++)
		{
			print("-- result " + catu_cntDone++ + " of " + catu_cntTotal + " --");
			if (loadType == 1)
			{CATU_TekScale(catu_chMeasureV, 2500);}
			else if (loadType == 2)
				
			{CATU_TekScale(catu_chMeasureV, (Math.sqrt(PowerValues[j] * catu_load)));} 	// U ~ sqrt (P*R)
			
			CATU_TekScale(catu_chMeasureI, (Math.sqrt(PowerValues[j] / catu_load)*1.1) * (1e-1));			// I ~ sqrt (P/R)
			TEK_TriggerInit(catu_chMeasureI, -(Math.sqrt(PowerValues[j] / catu_load)) * (8e-2));
			sleep(2000);

			catu_p_set.push(PowerValues[j]);

			atu_print = 0;
			atu_rep = catu_rep;
			ATU_StartP(catu_preCurrent, PowerValues[j]);
			atu_print = 1;
			sleep(6000);
			while (dev.r(96) != 4) sleep(500);

			// Unit data
			var v_read = dev.r(110);
			var i_read = dev.r(111);
			var p_read = dev.r(112);
			catu_v.push(v_read);
			catu_i.push(i_read);
			catu_p.push(p_read);
			print("V,  V: " + v_read);
			print("I, mA: " + i_read);
			print("P,  W: " + p_read);

			// Scope data
			var v_sc = Math.round(CATU_Measure(catu_chMeasureV, 3), 3);
			var i_sc = Math.round(CATU_Measure(catu_chMeasureI, 4)*10000, 3);
			var p_sc = Math.round(v_sc * i_sc / 1000, 3);
			catu_v_sc.push(v_sc);
			catu_i_sc.push(i_sc);
			catu_p_sc.push(p_sc);
			print("Vtek,  V: " + v_sc);
			print("Itek, mA: " + i_sc);
			print("Ptek,  W: " + p_sc);

			// Relative error
			catu_v_err.push(((v_read - v_sc) / v_sc * 100).toFixed(2));
			catu_i_err.push(((i_read - i_sc) / i_sc * 100).toFixed(2));
			catu_p_err.push(((p_read - p_sc) / p_sc * 100).toFixed(2));
			catu_pset_err.push(((p_read - PowerValues[j]) / PowerValues[j] * 100).toFixed(2));

			sleep(1000);

			print("----------------------");
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CATU_TekMeas(Channel)
{
	TEK_Send("MEASurement:MEAS" + Channel + ":TYPe MAXImum");
}

function CATU_TekScale(Channel, Value)
{
	// 0.7 - use 70% of full range
	// 7 - number of scope grids in full scale
	var scale = (Value / (0.7 * 7)).toFixed(2);
	TEK_Send("ch" + Channel + ":scale " + parseFloat(scale).toExponential());
}

function CATU_Measure(Channel, Resolution)
{
	var f = TEK_Measure(Channel);
	if (Math.abs(f) > 2e+4)
		f = 0;
	return parseFloat(f).toFixed(Resolution);
}

function CATU_PrintCal() //+
{
	if (CGEN_UseQuadraticCorrection())
	{
		print("I P2 x1e6:	" + dev.rs(18));
		print("I P1 x1000:	" + dev.r(19));
		print("I P0:		" + dev.rs(38));
		print("--------------------------");
		print("V P2 x1e6:	" + dev.rs(22));
		print("V P1 x1000:	" + dev.r(23));
		print("V P0:		" + dev.rs(32));
	}
	else
	{
		print("I K:		" + (dev.r(18) / dev.r(19)));
		print("I Offset: 	" + dev.rs(38));
		print("--------------------------");
		print("V K:		" + (dev.r(22) / dev.r(23)));
		print("V Offset: 	" + dev.rs(32));
	}
}

function CATU_ResetA()
{
	// Results storage
	catu_v = [];
	catu_i = [];
	catu_p = [];
	catu_p_set = [];

	// Tektronix data
	catu_v_sc = [];
	catu_i_sc = [];
	catu_p_sc = [];

	// Relative error
	catu_v_err = [];
	catu_i_err = [];
	catu_p_err = [];
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

function CATU_ResetCal()
{
	if (CGEN_UseQuadraticCorrection())
	{
		CATU_CalI2(0, 1, 0);
		CATU_CalV2(0, 1, 0);
	}
	else
	{
		CATU_CalI(1, 0);
		CATU_CalV(1, 0);
	}
}

function CATU_CalV(K, Offset)
{
	dev.w(11, Math.round(K * 1000));
	dev.w(12, 1000);
	dev.ws(10, Math.round(Offset));
}

function CATU_CalV2(P2, P1, P0)
{
	dev.ws(16, Math.round(P2 * 1e6));
	dev.w(11, Math.round(P1 * 1000));
	dev.w(12, 1000);
	dev.ws(10, Math.round(P0));
}

function CATU_CalI(K, Offset)
{
	dev.w(14, Math.round(K * 1000));
	dev.w(15, 1000);
	dev.ws(13, Math.round(Offset));
}

function CATU_CalI2(P2, P1, P0)
{
	dev.ws(17, Math.round(P2 * 1e6));
	dev.w(14, Math.round(P1 * 1000));
	dev.w(15, 1000);
	dev.ws(13, Math.round(P0));
}
