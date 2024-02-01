include("Tektronix.js")
include("CalGeneral.js")
include("Numeric.js")

// Global definitions
cbvt_VmaxAC = 8000;			// in V
cbvt_VminAC = 1000;			// in V
//
cbvt_ImaxAC = 300;			// in mA * 10
cbvt_IminAC = 5;			// in mA * 10
//
cbvt_Points = 10;

cbvt_VoltageProbeRatio = 1000;	// Коэффициент деления пробника напряжения
cbvt_StartVLow = 100;			// Стартовое напряжение для напряжений до 1000В (В)
cbvt_StartVHigh = 500;			// Стартовое напряжение для напряжений от 1000В (В)
//
cbvt_Shunt	= 99.45;		// in Ohms
cbvt_R		= 215930;		// in Ohms

// Voltage range number
cbvt_RangeV = 1;			// 1 = Range [ < 1000 V]; 2 = Range [ > 1000 V];

// Current range number
cbvt_RangeI = 1;			// 0 = Range [ < 5 mA]; 1 = Range [ < 30 mA]; 2 = Range [ > 30 mA]; 3 = Range [ < 5 mA] on Powerex BVT
//
cbvt_Freq1 = 50;			// in Hz
cbvt_Freq2 = 5;				// in Hz

// DC mode
cbvt_VmaxDC = 2000;			// in V
cbvt_VminDC = 500;			// in V
//
cbvt_ShuntDC = 51e3;		// in Ohms
cbvt_RDC = 100e6;			// in Ohms

// Current DC range number
cbvt_RangeIDC = 0;			// 0 = Range [ < 100 uA]; 1 = Range [ < 5000 uA];
//
cbvt_IlimitDC0 = 100;		// in uA
cbvt_IlimitDC1 = 5000;		// in uA

cbvt_UseRangeTuning = 1;
cbvt_UseMicroAmps = 1;		// Use microamp precision for current
//
cbvt_Vmax = 0;
cbvt_Vmin = 0;
cbvt_Vstp = 0;
//
cbvt_test_time = 1000;
cbvt_pulse_sleep = 1000;

// Counters
cbvt_cntTotal = 0;
cbvt_cntDone = 0;

// Results storage
cbvt_v = [];
cbvt_v_set = [];
cbvt_i = [];

// Tektronix data
cbvt_v_sc = [];
cbvt_i_sc = [];

// Relative error
cbvt_v_err = [];
cbvt_i_err = [];

// Summary error
cbvt_v_err_sum = [];
cbvt_i_err_sum = [];

// Correction
cbvt_v_corr = [];
cbvt_i_corr = [];

// Channels
cbvt_chMeasureV = 1;
cbvt_chMeasureI = 2;

// Iterations
cbvt_Iterations = 3;
cbvt_AvgLevel = 4;
cbvt_UseAvg = true;

// Measurement errors
EUosc = 3;
ER = 1;
E0 = 0;
cbvt_EnableSumError = false;

function CBVT_Init(portBVT, portTek, channelMeasureV, channelMeasureI)
{	
	if (channelMeasureV < 1 || channelMeasureV > 4 ||
		channelMeasureI < 1 || channelMeasureI > 4)
	{
		print("Wrong channel numbers");
		return;
	}
	
	// Copy channel information
	cbvt_chMeasureV = channelMeasureV;
	cbvt_chMeasureI = channelMeasureI;
	
	// Init BVT
	dev.Disconnect();
	dev.co(portBVT);
	
	// Init Tektronix
	TEK_PortInit(portTek);
	
	// Init channels
	TEK_ChannelInit(cbvt_chMeasureV, cbvt_VoltageProbeRatio, "100");
	TEK_ChannelInit(cbvt_chMeasureI, "1", "1");
	
	// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == cbvt_chMeasureV || i == cbvt_chMeasureI)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
}

function CBVT_CalibrateV()
{
	cbvt_Vmin = cbvt_VminAC;
	cbvt_Vmax = cbvt_VmaxAC;
	cbvt_Vstp = Math.round((cbvt_Vmax - cbvt_Vmin) / (cbvt_Points - 1));
	
	cbvt_VoltageValues = CGEN_GetRange(cbvt_Vmin, cbvt_Vmax, cbvt_Vstp);
	CBVT_ResetA();

	CBVT_ResetVCal();
	
	if (CBVT_Collect(cbvt_VoltageValues, cbvt_Iterations, 1))
	{
		CBVT_SaveV("bvt_v");
		
		// Plot relative error distribution
		scattern(cbvt_v_sc, cbvt_v_err, "Voltage (in V)", "Error (in %)", "Udrm/Urrm relative error " + cbvt_Vmin + "..." + cbvt_Vmax + " V");
		
		if (CGEN_UseQuadraticCorrection())
		{
			// Calculate correction
			cbvt_v_corr = CGEN_GetCorrection2("bvt_v");
			CBVT_Correct2V(cbvt_v_corr[0], cbvt_v_corr[1], cbvt_v_corr[2]);	
		}
		else
		{
			// Calculate correction
			cbvt_v_corr = CGEN_GetCorrection("bvt_v");
			CBVT_CorrectV(1 / cbvt_v_corr[0], cbvt_v_corr[1]);
		}
		
		CBVT_PrintVCal();
	}
}

function CBVT_VerifyV()
{
	cbvt_Vmin = cbvt_VminAC;
	cbvt_Vmax = cbvt_VmaxAC;
	cbvt_Vstp = Math.round((cbvt_Vmax - cbvt_Vmin) / (cbvt_Points - 1));
	
	cbvt_VoltageValues = CGEN_GetRange(cbvt_Vmin, cbvt_Vmax, cbvt_Vstp);
	CBVT_ResetA();
	
	if (CBVT_Collect(cbvt_VoltageValues, cbvt_Iterations, 1))
	{
		CBVT_SaveV("bvt_v_fixed");
		
		// Plot relative error distribution
		scattern(cbvt_v_sc, cbvt_v_err, "Voltage (in V)", "Error (in %)", "Udrm/Urrm relative error " + cbvt_Vmin + "..." + cbvt_Vmax + " V");
		
		// Plot summary error distribution
		if (cbvt_EnableSumError)
			scattern(cbvt_v_sc, cbvt_v_err_sum, "Voltage (in V)", "Error (in %)", "Udrm/Urrm summary error " + cbvt_Vmin + "..." + cbvt_Vmax + " V");
	}
}

function CBVT_CalibrateI()
{
	var Vmax = Math.round((cbvt_ImaxAC / 10) * cbvt_R * 0.95 / 1000);
	cbvt_Vmin = Math.round((cbvt_IminAC / 10) * cbvt_R * 1.05 / 1000);
	cbvt_Vmax = (Vmax > cbvt_VmaxAC) ? cbvt_VmaxAC : Vmax;
	cbvt_Vstp = Math.round((cbvt_Vmax - cbvt_Vmin) / (cbvt_Points - 1));
	
	cbvt_VoltageValues = CGEN_GetRange(cbvt_Vmin, cbvt_Vmax, cbvt_Vstp);
	CBVT_ResetA();

	CBVT_ResetICal();
	
	if (CBVT_Collect(cbvt_VoltageValues, cbvt_Iterations, 2))
	{
		CBVT_SaveI("bvt_i");
		
		// Plot relative error distribution
		scattern(cbvt_i_sc, cbvt_i_err, "Current (in mA)", "Error (in %)", "Irrm/Idrm relative error < " + cbvt_ImaxAC / 10 + " mA");
		
		if (CGEN_UseQuadraticCorrection())
		{
			// Calculate correction
			cbvt_i_corr = CGEN_GetCorrection2("bvt_i");
			CBVT_Correct2I(cbvt_i_corr[0], cbvt_i_corr[1], cbvt_i_corr[2]);
		}
		else
		{
			// Calculate correction
			cbvt_i_corr = CGEN_GetCorrection("bvt_i");
			CBVT_CorrectI(1 / cbvt_i_corr[0], cbvt_i_corr[1]);
		}
		
		CBVT_PrintICal();
	}
}

function CBVT_VerifyI()
{
	var Vmax = Math.round((cbvt_ImaxAC / 10) * cbvt_R * 0.95 / 1000);
	cbvt_Vmin = Math.round((cbvt_IminAC / 10) * cbvt_R * 1.05 / 1000);
	cbvt_Vmax = (Vmax > cbvt_VmaxAC) ? cbvt_VmaxAC : Vmax;
	cbvt_Vstp = Math.round((cbvt_Vmax - cbvt_Vmin) / (cbvt_Points - 1));

	cbvt_VoltageValues = CGEN_GetRange(cbvt_Vmin, cbvt_Vmax, cbvt_Vstp);
	CBVT_ResetA();
	
	if (CBVT_Collect(cbvt_VoltageValues, cbvt_Iterations, 2))
	{
		CBVT_SaveI("bvt_i_fixed");
		
		// Plot relative error distribution
		scattern(cbvt_i_sc, cbvt_i_err, "Current (in mA)", "Error (in %)", "Irrm/Idrm relative error < " + cbvt_ImaxAC / 10 + " mA");

		// Plot relative error distribution
		if (cbvt_EnableSumError)
			scattern(cbvt_i_sc, cbvt_i_err_sum, "Current (in mA)", "Error (in %)", "Irrm/Idrm summary error < " + cbvt_ImaxAC / 10 + " mA");
	}
}

function CBVT_CalibrateVDC()
{
	cbvt_Vmin = cbvt_VminDC;
	cbvt_Vmax = cbvt_VmaxDC;
	cbvt_Vstp = Math.round((cbvt_Vmax - cbvt_Vmin) / (cbvt_Points - 1));
	
	cbvt_VoltageValues = CGEN_GetRange(cbvt_Vmin, cbvt_Vmax, cbvt_Vstp);
	CBVT_ResetA();

	CBVT_ResetVCal();
	
	if (CBVT_CollectDC(cbvt_VoltageValues, cbvt_Iterations, 1))
	{
		CBVT_SaveV("bvt_v_dc");
		
		// Plot relative error distribution
		scattern(cbvt_v_sc, cbvt_v_err, "Voltage (in V)", "Error (in %)", "DC voltage relative error " + cbvt_Vmin + "..." + cbvt_Vmax + " V");
		
		if (CGEN_UseQuadraticCorrection())
		{
			// Calculate correction
			cbvt_v_corr = CGEN_GetCorrection2("bvt_v_dc");
			CBVT_Correct2V(cbvt_v_corr[0], cbvt_v_corr[1], cbvt_v_corr[2]);	
		}
		else
		{
			// Calculate correction
			cbvt_v_corr = CGEN_GetCorrection("bvt_v_dc");
			CBVT_CorrectV(1 / cbvt_v_corr[0], cbvt_v_corr[1]);
		}
		
		CBVT_PrintVCal();
	}
}

function CBVT_VerifyVDC()
{
	cbvt_Vmin = cbvt_VminDC;
	cbvt_Vmax = cbvt_VmaxDC;
	cbvt_Vstp = Math.round((cbvt_Vmax - cbvt_Vmin) / (cbvt_Points - 1));
	
	cbvt_VoltageValues = CGEN_GetRange(cbvt_Vmin, cbvt_Vmax, cbvt_Vstp);
	CBVT_ResetA();
	
	if (CBVT_CollectDC(cbvt_VoltageValues, cbvt_Iterations, 1))
	{
		CBVT_SaveV("bvt_v_dc_fixed");
		
		// Plot relative error distribution
		scattern(cbvt_v_sc, cbvt_v_err, "Voltage (in V)", "Error (in %)", "DC voltage relative error " + cbvt_Vmin + "..." + cbvt_Vmax + " V");
	}
}

function CBVT_CalibrateIDC()
{
	var Vmax = Math.round(CBVT_GetILimDC() * cbvt_RDC * 0.95 / 1e6);
	cbvt_Vmin = 500;
	cbvt_Vmax = (Vmax > cbvt_VmaxDC) ? cbvt_VmaxDC : Vmax;
	cbvt_Vstp = Math.round((cbvt_Vmax - cbvt_Vmin) / (cbvt_Points - 1));
	
	cbvt_VoltageValues = CGEN_GetRange(cbvt_Vmin, cbvt_Vmax, cbvt_Vstp);
	CBVT_ResetA();

	CBVT_ResetICalDC();
	
	if (CBVT_CollectDC(cbvt_VoltageValues, cbvt_Iterations, 2))
	{
		CBVT_SaveI("bvt_i_dc");
		
		// Plot relative error distribution
		scattern(cbvt_i_sc, cbvt_i_err, "Current (in V)", "Error (in %)", "DC current relative error");
		
		if (CGEN_UseQuadraticCorrection())
		{
			// Calculate correction
			cbvt_i_corr = CGEN_GetCorrection2("bvt_i_dc");
			CBVT_Correct2IDC(cbvt_i_corr[0], cbvt_i_corr[1], cbvt_i_corr[2]);
		}
		else
		{
			print("Linear correction not supported for DC current.");
			return;
		}
		
		CBVT_PrintICalDC();
	}
}

function CBVT_VerifyIDC()
{
	var Vmax = Math.round(CBVT_GetILimDC() * cbvt_RDC * 0.95 / 1e6);
	cbvt_Vmin = cbvt_VminDC;
	cbvt_Vmax = cbvt_VmaxDC;
	cbvt_Vstp = Math.round((cbvt_Vmax - cbvt_Vmin) / (cbvt_Points - 1));
	
	cbvt_VoltageValues = CGEN_GetRange(cbvt_Vmin, cbvt_Vmax, cbvt_Vstp);
	CBVT_ResetA();
	
	if (CBVT_CollectDC(cbvt_VoltageValues, cbvt_Iterations, 2))
	{
		CBVT_SaveI("bvt_i_dc_fixed");
		
		// Plot relative error distribution
		scattern(cbvt_i_sc, cbvt_i_err, "Current (in uA)", "Error (in %)", "DC current relative error");
	}
}

function CBVT_Collect(VoltageValues, IterationsCount, PrintMode)
{
	print("Load resistance set to " + (cbvt_R / 1000) + " kOhms");
	print("Shunt resistance set to " + cbvt_Shunt + " Ohms");
	print("-----------");
	
	CBVT_UpdateVoltageProbeRatio(cbvt_chMeasureV, cbvt_VoltageProbeRatio);
	// Acquire mode
	cbvt_UseAvg ? TEK_AcquireAvg(cbvt_AvgLevel) : TEK_AcquireSample();
	// Init measurement
	CBVT_TekMeasurement(cbvt_chMeasureV);
	CBVT_TekMeasurement(cbvt_chMeasureI);
	// Horizontal settings
	TEK_Horizontal("1e-3", "-2e-3");
	// Init trigger
	if (PrintMode == 1)
	{
		TEK_TriggerPulseInit(cbvt_chMeasureV, "100");
	}

	if (PrintMode == 2)
	{
		TEK_TriggerPulseInit(cbvt_chMeasureI, "0.05");
	}

	sleep(500);
	
	cbvt_cntTotal = IterationsCount * VoltageValues.length;
	cbvt_cntDone = 0;
	
	// Power-up
	if (dev.r(192) == 0) dev.c(1);
	if (dev.r(192) != 4)
	{
		print("Power-up error");
		return 0;
	}
	
	// Global configuration
	dev.w(128, 3);																// Test type - reverse pulse
	dev.w(130, cbvt_ImaxAC);													// Current limit
	dev.w(132, cbvt_test_time);													// Plate time
	dev.w(133, 10);																// Rise rate
	dev.w(136, Math.round(50 / (((cbvt_ImaxAC / 10) < 50) ? cbvt_Freq1 : cbvt_Freq2)));	// Frequency divisor
	
	CBVT_TekScale(cbvt_chMeasureV, cbvt_Vmax);
	CBVT_TekScale(cbvt_chMeasureI, (cbvt_Vmax / cbvt_R * cbvt_Shunt));
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < VoltageValues.length; j++)
		{
			if (cbvt_UseRangeTuning)
			{
				CBVT_TekScale(cbvt_chMeasureV, VoltageValues[j]);
				CBVT_TekScale(cbvt_chMeasureI, (VoltageValues[j] / cbvt_R * cbvt_Shunt));
			}

			if (PrintMode == 1)
			{
				TEK_TriggerLevelF(VoltageValues[j] / 2);
			}

			if (PrintMode == 2)
			{
				TEK_TriggerLevelF((VoltageValues[j] / cbvt_R * cbvt_Shunt) / 2);
			}

			sleep(200);
			
			dev.w(134, (VoltageValues[j] < 1000) ? cbvt_StartVLow : cbvt_StartVHigh);	// Start voltage
			dev.w(131, VoltageValues[j]);	// Target voltage
			CBVT_Probe(PrintMode);
			if (anykey()) return 0;
		}
	}
	
	return 1;
}

function CBVT_CollectDC(VoltageValues, IterationsCount, PrintMode)
{
	print("Load resistance set to " + (cbvt_RDC / 1000) + " kOhms");
	print("Shunt resistance set to " + cbvt_ShuntDC + " Ohms");
		
	// Acquire mode
	TEK_AcquireSample();
	// Init measurement
	CBVT_TekMeasurement(cbvt_chMeasureV);
	CBVT_TekMeasurement(cbvt_chMeasureI);
	// Horizontal settings
	TEK_Horizontal("0.25", "-0.75");
	// Init trigger
	if (PrintMode == 1)
	{
		CBVT_TriggerInit(cbvt_chMeasureV, "100");
	}

	if (PrintMode == 2)
	{
		CBVT_TriggerInit(cbvt_chMeasureI, "0.05");
	}
	
	sleep(500);
	
	cbvt_cntTotal = IterationsCount * VoltageValues.length;
	cbvt_cntDone = 0;
	
	// Power-up
	if (dev.r(192) == 0) dev.c(1);
	if (dev.r(192) != 4)
	{
		print("Power-up error");
		return 0;
	}
	
	// Global configuration
	dev.w(128, 4);			// Test type - DC
	dev.w(138, 2000);		// Plate time
	dev.w(141, 10);			// Rise rate
	dev.w(140, 500);		// Start voltage
	dev.w(139, CBVT_GetILimDC());		// Limit current
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < VoltageValues.length; j++)
		{
			// Configure channels
			if (cbvt_UseRangeTuning)
			{
				CBVT_TekScale(cbvt_chMeasureV, VoltageValues[j]);
				CBVT_TekScale(cbvt_chMeasureI, VoltageValues[j] / cbvt_RDC * cbvt_ShuntDC);
			}

			if (PrintMode == 1)
			{
				TEK_TriggerLevelF(VoltageValues[j] / 2);
			}

			if (PrintMode == 2)
			{
				TEK_TriggerLevelF((VoltageValues[j] / cbvt_RDC * cbvt_ShuntDC) / 2);
			}

			sleep(1000);
			
			dev.w(140, VoltageValues[j]);
			CBVT_ProbeDC(PrintMode);
			
			if (anykey()) return 0;
		}
	}
	
	return 1;
}

function CBVT_TriggerInit(Channel, Level)
{
	TEK_Send("trigger:main:level " + Level);
	TEK_Send("trigger:main:mode normal");
	TEK_Send("trigger:main:type edge");
	TEK_Send("trigger:main:edge:coupling dc");
	TEK_Send("trigger:main:edge:slope fall");
	TEK_Send("trigger:main:edge:source ch" + Channel);
}

function CBVT_MeasureV(Channel)
{
	var f = TEK_Measure(Channel);
	if (Math.abs(f) > 2e+4)
		f = 0;
	return Math.round(f);
}

function CBVT_MeasureI(Channel)
{
	var f = TEK_Measure(Channel);
	if (Math.abs(f) > 2e+4)
		f = 0;
	return f / cbvt_Shunt * 1000;
}

function CBVT_MeasureIDC(Channel)
{
	var f = TEK_Measure(Channel);
	if (Math.abs(f) > 2e+4)
		f = 0;
	return ((f * 1000000) / cbvt_ShuntDC);
}

function CBVT_Probe(PrintMode)
{
	dev.c(100);
	while (dev.r(192) == 5) sleep(500);
	
	sleep(600);
	var f_v = CBVT_MeasureV(cbvt_chMeasureV);
	var f_i = CBVT_MeasureI(cbvt_chMeasureI);
	
	var v = Math.abs(dev.rs(198));
	var i = CBVT_ReadCurrent(cbvt_UseMicroAmps);

	var v_set = dev.r(131);

	cbvt_v.push(v.toFixed(0));
	cbvt_v_set.push(v_set.toFixed(0));
	cbvt_i.push(i.toFixed(3));
	//
	cbvt_v_sc.push(f_v.toFixed(0));
	cbvt_i_sc.push(f_i.toFixed(3));

	// Relative error
	cbvt_v_err.push(((f_v - v) / v * 100).toFixed(2));
	cbvt_i_err.push(((f_i - i) / i * 100).toFixed(2));
	
	// Summary error
	E0 = Math.sqrt(Math.pow(EUosc, 2) + Math.pow(ER, 2));
	cbvt_v_err_sum.push(1.1 * Math.sqrt(Math.pow((v - f_v) / f_v * 100, 2) + Math.pow(E0, 2)));
	cbvt_i_err_sum.push(1.1 * Math.sqrt(Math.pow((i - f_i) / f_i * 100, 2) + Math.pow(E0, 2)));
	
	switch (PrintMode)
	{
		case 1:
			print("V,     V: " + v);
			print("Vtek,  V: " + f_v);
			print("Погр,  %: " + ((v - f_v) / f_v * 100).toFixed(2));
			break;
		
		case 2:
			print("I,    mA: " + i.toFixed(cbvt_UseMicroAmps ? 3 : 1));
			print("Itek, mA: " + f_i.toFixed(3));
			print("Погр,  %: " + ((i - f_i) / f_i * 100).toFixed(2));
			break;
	}
	
	cbvt_cntDone++;
	if (PrintMode)
		print("-- result " + cbvt_cntDone + " of " + cbvt_cntTotal + " --");
	
	sleep(cbvt_pulse_sleep);
}

function CBVT_ProbeDC(PrintMode)
{
	dev.c(100);
	while (dev.r(192) == 5) sleep(100);
	
	sleep(2200);
	
	var f_v = CBVT_MeasureV(cbvt_chMeasureV);
	var f_i = CBVT_MeasureIDC(cbvt_chMeasureI);
	
	var v = Math.abs(dev.rs(198));
	var i = CBVT_ReadCurrent(cbvt_UseMicroAmps) * 1000;

	sleep(200);
	
	cbvt_v.push(v.toFixed(2));
	cbvt_i.push(i.toFixed(3));
	//
	cbvt_v_sc.push(f_v.toFixed(2));
	cbvt_i_sc.push(f_i.toFixed(3));
	
	// Relative error
	cbvt_v_err.push(((f_v - v) / v * 100).toFixed(2));
	cbvt_i_err.push(((f_i - i) / i * 100).toFixed(2));
	
	switch (PrintMode)
	{
		case 1:
			print("V,     V: " + v);
			print("Vtek,  V: " + f_v);
			print("Погр,  %: " + ((v - f_v) / f_v * 100).toFixed(2));
			break;
		
		case 2:
			print("I,    uA: " + i);
			print("Itek, uA: " + f_i.toFixed(3));
			print("Погр,  %: " + ((i - f_i) / f_i * 100).toFixed(2));
			break;
	}
	
	cbvt_cntDone++;
	if (PrintMode)
		print("-- result " + cbvt_cntDone + " of " + cbvt_cntTotal + " --");
	
	sleep(1000);
}

function CBVT_ReadCurrent(UseMicroAmps)
{
	var CoarseI = Math.abs(dev.rs(199) / 10);
	if (UseMicroAmps)
		return Math.floor(dev.r(199) / 10) + dev.r(200) / 1000 + dev.r(202) / 1000000;
	else
		return CoarseI;
}

function CBVT_UpdateVoltageProbeRatio(Channel, Ratio)
{
	TEK_Send("ch" + Channel + ":probe " + Ratio);
}

function CBVT_GetILimDC()
{
	if (cbvt_RangeIDC == 0)
		return cbvt_IlimitDC0;
	else if (cbvt_RangeIDC == 1)
		return cbvt_IlimitDC1;
}

function CBVT_TekMeasurement(Channel)
{
	TEK_Send("measurement:meas" + Channel + ":source ch" + Channel);
	TEK_Send("measurement:meas" + Channel + ":type maximum");
}

function CBVT_TekScale(Channel, Value)
{
	// 0.9 - use 90% of full range
	// 8 - number of scope grids in full scale
	var scale = (Value / (8 * 0.9));
	TEK_Send("ch" + Channel + ":scale " + scale);
}

// ResetArrays
function CBVT_ResetA()
{
	// Results storage
	cbvt_v = [];
	cbvt_i = [];

	// Tektronix data
	cbvt_v_sc = [];
	cbvt_i_sc = [];

	// Relative error
	cbvt_v_err = [];
	cbvt_i_err = [];
	
	// Summary error
	cbvt_v_err_sum = [];
	cbvt_i_err_sum = [];

	// Correction
	cbvt_v_corr = [];
	cbvt_i_corr = [];
}

// Save
function CBVT_SaveV(NameV)
{
	CGEN_SaveArrays(NameV, cbvt_v, cbvt_v_sc, cbvt_v_err);
}

function CBVT_SaveI(NameI)
{
	CGEN_SaveArrays(NameI, cbvt_i, cbvt_i_sc, cbvt_i_err);
}

// Cal
function CBVT_CalV1(K, Offset)
{
	dev.w(104, Math.round(K * 1000));
	dev.w(105, 1000);
	dev.ws(114, Math.round(Offset * 10));
}

function CBVT_Cal2V1(P2, P1, P0)
{
	dev.ws(104, Math.round(P2 * 1e6));
	dev.w(105, Math.round(P1 * 1000));
	dev.ws(114, Math.round(P0 * 10));
}

function CBVT_CalV2(K, Offset)
{
	dev.w(106, Math.round(K * 1000));
	dev.w(107, 1000);
	dev.ws(115, Math.round(Offset * 10));
}

function CBVT_Cal2V2(P2, P1, P0)
{
	dev.ws(106, Math.round(P2 * 1e6));
	dev.w(107, Math.round(P1 * 1000));
	dev.ws(115, Math.round(P0 * 10));
}

function CBVT_CalI1(K, Offset)
{
	dev.w(96, Math.round(K * 1000));
	dev.w(97, 1000);
	dev.ws(116, Math.round(Offset * 1000));
}

function CBVT_Cal2I1(P2, P1, P0)
{
	dev.ws(96, Math.round(P2 * 1e6));
	dev.w(97, Math.round(P1 * 1000));
	dev.ws(116, Math.round(P0 * 1000));
}

function CBVT_CalI2(K, Offset)
{
	dev.w(98, Math.round(K * 1000));
	dev.w(99, 1000);
	dev.ws(117, Math.round(Offset * 1000));
}

function CBVT_Cal2I2(P2, P1, P0)
{
	dev.ws(98, Math.round(P2 * 1e6));
	dev.w(99, Math.round(P1 * 1000));
	dev.ws(117, Math.round(P0 * 1000));
}

function CBVT_CalI3(K, Offset)
{
	dev.w(112, Math.round(K * 1000));
	dev.w(113, 1000);
	dev.ws(118, Math.round(Offset * 1000));
}

function CBVT_Cal2I3(P2, P1, P0)
{
	dev.ws(112, Math.round(P2 * 1e6));
	dev.w(113, Math.round(P1 * 1000));
	dev.ws(118, Math.round(P0 * 1000));
}

function CBVT_Cal2IDC0(P2, P1, P0)
{
	dev.ws(112, Math.round(P2 * 1e6));
	dev.w(113, Math.round(P1 * 1000));
	dev.ws(118, Math.round(P0 * 1000));
}

function CBVT_Cal2IDC1(P2, P1, P0)
{
	dev.ws(108, Math.round(P2 * 1e6));
	dev.w(109, Math.round(P1 * 1000));
	dev.ws(110, Math.round(P0 * 1000));
}

// Print
function CBVT_PrintVCal()
{
	if (CGEN_UseQuadraticCorrection())
	{
		switch (cbvt_RangeV)
		{
			case 1:
				print("Range [ < 1000 V]");
				print("V1 P2 x1e6:	" + dev.rs(104));
				print("V1 P1 x1000:	" + dev.r(105));
				print("V1 P0 x10:	" + dev.rs(114));
				break;
			case 2:
				print("Range [1000 - " + cbvt_VmaxAC + "V]");
				print("V2 P2 x1e6:	" + dev.rs(106));
				print("V2 P1 x1000:	" + dev.r(107));
				print("V2 P0 x10:	" + dev.rs(115));
				break;
			default:
				print("Incorrect V range.");
				break;
		}
	}
	else
	{
		switch (cbvt_RangeV)
		{
			case 1:
				print("Range [ < 1000 V]");
				print("V1 K:		" + (dev.r(104) / dev.r(105)));
				print("V1 Offset:	" + (dev.rs(114) / 10));
				break;
			case 2:
				print("Range [1000 - " + cbvt_VmaxAC + "V]");
				print("V2 K:		" + (dev.r(106) / dev.r(107)));
				print("V2 Offset:	" + (dev.rs(115) / 10));
				break;
			default:
				print("Incorrect V range.");
				break;
		}
	}
}

function CBVT_PrintICal()
{
	print("Range " + cbvt_RangeI + " [ " + cbvt_IminAC / 10 + "..." + cbvt_ImaxAC / 10 + " mA]");
	if (CGEN_UseQuadraticCorrection())
	{
		switch (cbvt_RangeI)
		{
			case 0:
				print("I0 P2 x1e6:	" + dev.rs(112));
				print("I0 P1 x1000:	" + dev.r(113));
				print("I0 P0 x1000:	" + dev.rs(118));
				break;
			case 1:
				print("I1 P2 x1e6:	" + dev.rs(96));
				print("I1 P1 x1000:	" + dev.r(97));
				print("I1 P0 x1000:	" + dev.rs(116));
				break;
			case 2:
				print("I2 P2 x1e6:	" + dev.rs(98));
				print("I2 P1 x1000:	" + dev.r(99));
				print("I2 P0 x1000:	" + dev.rs(117));
				break;
			case 3:
				print("I3 P2 x1e6:	" + dev.rs(108));
				print("I3 P1 x1000:	" + dev.r(109));
				print("I3 P0 x1000:	" + dev.rs(110));
				break;
			default:
				print("Incorrect I range.");
				break;
		}
	}
	else
	{
		switch (cbvt_RangeI)
		{
			case 1:
				print("I1 K:		" + (dev.r(96) / dev.r(97)));
				print("I1 Offset:	" + (dev.rs(116) / 1000));
				break;
			case 2:
				print("I2 K:		" + (dev.r(98) / dev.r(99)));
				print("I2 Offset:	" + (dev.rs(117) / 1000));
				break;
			case 3:
				print("I3 K:		" + (dev.r(112) / dev.r(113)));
				print("I3 Offset:	" + (dev.rs(118) / 1000));
				break;
			default:
				print("Incorrect I range.");
				break;
		}
	}
}

function CBVT_PrintICalDC()
{
	if (CGEN_UseQuadraticCorrection())
	{
			switch (cbvt_RangeIDC)
			{
				case 0:
					print("Range [ < 100 uA]");
					print("IDC0 P2 x1e6:	" + dev.rs(112));
					print("IDC0 P1 x1000:	" + dev.r(113));
					print("IDC0 P0 x1000:	" + dev.rs(118));
					break;
				case 1:
					print("Range [100 - 5000 uA]");
					print("IDC1  P2 x1e6:	" + dev.rs(108));
					print("IDC1  P1 x1000:	" + dev.r(109));
					print("IDC1  P0 x1000:	" + dev.rs(110));
					break;
				default:
					print("Incorrect I DC range.");
					break;
			}
	}
	else
		print("Linear correction not supported for DC current.");
}

// Reset
function CBVT_ResetVCal()
{
	if (CGEN_UseQuadraticCorrection())
	{
		switch (cbvt_RangeV)
		{
			case 1:
				CBVT_Cal2V1(0, 1, 0);
				print("Range [ < 1000 V]");
				print("Voltage calibration reset done");
				break;
			case 2:
				CBVT_Cal2V2(0, 1, 0);
				print("Range [1000 - " + cbvt_VmaxAC + "V]");
				print("Voltage calibration reset done");
				break;
			default:
				print("Incorrect V range.");
				break;
		}
	}
	else
	{
		switch (cbvt_RangeV)
		{
			case 1:
				CBVT_CalV1(1, 0);
				print("Range [ < 1000 V]");
				print("Voltage calibration reset done");
				break;
			case 2:
				CBVT_CalV2(1, 0);
				print("Range [1000 - " + cbvt_VmaxAC + "V]");
				print("Voltage calibration reset done");
				break;
			default:
				print("Incorrect V range.");
				break;
		}
	}
}

function CBVT_ResetICal()
{
	print("Range " + cbvt_RangeI + " [ " + cbvt_IminAC / 10 + "..." + cbvt_ImaxAC / 10 + " mA]");
	if (CGEN_UseQuadraticCorrection())
	{
		switch (cbvt_RangeI)
		{
			case 0:
				CBVT_Cal2IDC0(0, 1, 0);
				print("Current calibration reset done");
				break;
			case 1:
				CBVT_Cal2I1(0, 1, 0);
				print("Current calibration reset done");
				break;
			case 2:
				CBVT_Cal2I2(0, 1, 0);
				print("Current calibration reset done");
				break;
			case 3:
				CBVT_Cal2IDC1(0, 1, 0);
				print("Current calibration reset done");
				break;
			default:
				print("Incorrect I range.");
				break;
		}
	}
	else
	{
		switch (cbvt_RangeI)
		{
			case 1:
				CBVT_CalI1(1, 0);
				print("Current calibration reset done");
				break;
			case 2:
				CBVT_CalI2(1, 0);
				print("Current calibration reset done");
				break;
			case 3:
				CBVT_CalI3(1, 0);
				print("Current calibration reset done");
				break;
			default:
				print("Incorrect I range.");
				break;
		}
	}
}

function CBVT_ResetICalDC()
{
	if (CGEN_UseQuadraticCorrection())
	{
		switch (cbvt_RangeIDC)
		{
			case 0:
				CBVT_Cal2IDC0(0, 1, 0);
				print("Range [ < 100 uA]");
				print("Current calibration reset done");
				break;
			case 1:
				CBVT_Cal2IDC1(0, 1, 0);
				print("Range [100 - 5000 uA]");
				print("Current calibration reset done");
				break;
			default:
				print("Incorrect I DC range.");
				break;
		}
	}
	else
		print("Linear correction not supported for DC current.");
}

// Correct
function CBVT_CorrectV(K, Offset)
{
	switch (cbvt_RangeV)
	{
		case 1:
			CBVT_CalV1(K, Offset);
			print("Range [ < 1000 V]");
			print("Voltage calibration updated");
			break;
		case 2:
			CBVT_CalV2(K, Offset);
			print("Range [1000 - " + cbvt_VmaxAC + "V]");
			print("Voltage calibration updated");
			break;
		default:
			print("Incorrect V range.");
			break;
	}
}

function CBVT_Correct2V(P2, P1, P0)
{
	switch (cbvt_RangeV)
	{
		case 1:
			CBVT_Cal2V1(P2, P1, P0);
			print("Range [ < 1000 V]");
			print("Voltage calibration updated");
			break;
		case 2:
			CBVT_Cal2V2(P2, P1, P0);
			print("Range [1000 - " + cbvt_VmaxAC + "V]");
			print("Voltage calibration updated");
			break;
		default:
			print("Incorrect V range.");
			break;
	}
}

function CBVT_CorrectI(K, Offset)
{
	switch (cbvt_RangeI)
	{
		case 1:
			CBVT_CalI1(K, Offset);
			print("Range [ < 30 mA]");
			print("Current calibration updated");
			break;
		case 2:
			CBVT_CalI2(K, Offset);
			print("Range [30 - 300 mA]");
			print("Current calibration updated");
			break;
		case 3:
			CBVT_CalI3(K, Offset);
			print("Range [ > 300 mA]");
			print("Current calibration updated");
			break;
		default:
			print("Incorrect I range.");
			break;
	}
}

function CBVT_Correct2I(P2, P1, P0)
{
	print("Range " + cbvt_RangeI + " [ " + cbvt_IminAC / 10 + "..." + cbvt_ImaxAC / 10 + " mA]");
	switch (cbvt_RangeI)
	{
		case 0:
			CBVT_Cal2IDC0(P2, P1, P0);
			print("Current calibration updated");
			break;
		case 1:
			CBVT_Cal2I1(P2, P1, P0);
			print("Current calibration updated");
			break;
		case 2:
			CBVT_Cal2I2(P2, P1, P0);
			print("Current calibration updated");
			break;
		case 3:
			CBVT_Cal2IDC1(P2, P1, P0);
			print("Current calibration updated");
			break;
		default:
			print("Incorrect I range.");
			break;
	}
}

function CBVT_Correct2IDC(P2, P1, P0)
{
	switch (cbvt_RangeIDC)
	{
		case 0:
			CBVT_Cal2IDC0(P2, P1, P0);
			print("Range [ < 100 uA]");
			print("Current calibration updated");
			break;
		case 1:
			CBVT_Cal2IDC1(P2, P1, P0);
			print("Range [100 - 5000 uA]");
			print("Current calibration updated");
			break;
		default:
			print("Incorrect I DC range.");
			break;
	}
}

// HMIU calibration
function Measuring_Filter()
{
	allowedMeasuring = "TPS2000";
	return allowedMeasuring;
}

function CBVT_Initialize()
{
	cbvt_chMeasureI = 2;
	cbvt_chMeasureV = 1;
	TEK_ChannelInit(cbvt_chMeasureV, cbvt_VoltageProbeRatio, "100");
	TEK_ChannelInit(cbvt_chMeasureI, "1", "1");
	for (var i = 1; i <= 4; i++) {
		if (i == cbvt_chMeasureV || i == cbvt_chMeasureI)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
}

function CBVT_VerifyIdrm(rangeId, rangeMin, rangeMax, count, verificationCount, resistance, addedResistance)
{
	cbvt_RangeI = rangeId;
	cbvt_IminAC = rangeMin;
	cbvt_ImaxAC = rangeMax;
	cbvt_Points = count;
	cbvt_Iterations = verificationCount;
	cbvt_Shunt = resistance;
	cbvt_R = 22010;
	cbvt_test_time = 2000;
	CBVT_Initialize();
	CBVT_VerifyI();
	return [cbvt_v_set, cbvt_i, cbvt_i_sc, cbvt_i_err];
}

function CBVT_VerifyVdrm(rangeId, rangeMin, rangeMax, count, verificationCount, resistance, addedResistance)
{
	cbvt_RangeV = rangeId;
	cbvt_VminAC = rangeMin;
	cbvt_VmaxAC = rangeMax;
	cbvt_Points = count;
	cbvt_Iterations = verificationCount;
	CBVT_Initialize();
	CBVT_VerifyV();
	return [cbvt_v_set, cbvt_v, cbvt_v_sc, cbvt_v_err];
}

function CBVT_VerifyIrrm(rangeId, rangeMin, rangeMax, count, verificationCount, resistance, addedResistance)
{
	cbvt_RangeI = rangeId;
	cbvt_IminAC = rangeMin;
	cbvt_ImaxAC = rangeMax;
	cbvt_Points = count;
	cbvt_Iterations = verificationCount;
	cbvt_Shunt = resistance;
	cbvt_R = 220100;
	cbvt_test_time = 2000;
	CBVT_Initialize();
	CBVT_VerifyI();
	return [cbvt_v_set, cbvt_i, cbvt_i_sc, cbvt_i_err];
}

function CBVT_VerifyVrrm(rangeId, rangeMin, rangeMax, count, verificationCount, resistance, addedResistance)
{
	cbvt_RangeV = rangeId;
	cbvt_VminAC = rangeMin;
	cbvt_VmaxAC = rangeMax;
	cbvt_Points = count;
	cbvt_Iterations = verificationCount;
	CBVT_Initialize();
	CBVT_VerifyV();
	return [cbvt_v_set, cbvt_v, cbvt_v_sc, cbvt_v_err];
}
