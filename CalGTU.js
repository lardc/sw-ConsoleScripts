include("TestGTU.js")
include("Tektronix.js")
include("CalGeneral.js")

// Global definitions
cgtu_ResGate  = 5;	// in Ohms
cgtu_ResPower = 10;	// in Ohms
cgtu_CurrentValues = [];
//
cgtu_UseAvg = 1;
cgtu_UseRangeTuning = 1;

// Current limits
cgtu_Imax = 700;
cgtu_Imin = 50;
cgtu_Istp = 50;

// Counters
cgtu_cntTotal = 0;
cgtu_cntDone = 0;

// Results storage
cgtu_igt = [];
cgtu_vgt = [];
cgtu_ih = [];

// Tektronix data
cgtu_igt_sc = [];
cgtu_vgt_sc = [];
cgtu_ih_sc = [];

// Relative error
cgtu_igt_err = [];
cgtu_vgt_err = [];
cgtu_ih_err = [];

// Summary error
cgtu_igt_err_sum = [];
cgtu_vgt_err_sum = [];
cgtu_ih_err_sum = [];

// Correction
cgtu_igt_corr = [];
cgtu_vgt_corr = [];
cgtu_ih_corr = [];

cgtu_chMeasureGate = 1;
cgtu_chMeasurePower = 1;

// Iterations
cgtu_Iterations = 3;

// Measurement errors
EUosc = 3;
ER = 1;
E0 = 0;


function CGTU_CalibrateGate()
{
	// Collect data
	CGTU_ResetA();
	CGTU_ResetGateCal();
	if (CGTU_CollectGate(cgtu_Iterations))
	{
		CGTU_SaveGate("gtu_igt", "gtu_vgt");
		
		// Plot relative error distribution
		scattern(cgtu_igt_sc, cgtu_igt_err, "Igt (in mA)", "Error (in %)", "Igt relative error"); sleep(200);
		scattern(cgtu_vgt_sc, cgtu_vgt_err, "Vgt (in mV)", "Error (in %)", "Vgt relative error");
		
		if (CGEN_UseQuadraticCorrection())
		{
			// Calculate correction
			cgtu_igt_corr = CGEN_GetCorrection2("gtu_igt");
			CGTU_CalIGT2(cgtu_igt_corr[0], cgtu_igt_corr[1], cgtu_igt_corr[2]);
			
			cgtu_vgt_corr = CGEN_GetCorrection2("gtu_vgt");
			CGTU_CalVGT2(cgtu_vgt_corr[0], cgtu_vgt_corr[1], cgtu_vgt_corr[2]);
		}
		else
		{
			// Calculate correction
			cgtu_igt_corr = CGEN_GetCorrection("gtu_igt");
			CGTU_CalIGT(cgtu_igt_corr[0], cgtu_igt_corr[1]);
			
			cgtu_vgt_corr = CGEN_GetCorrection("gtu_vgt");
			CGTU_CalVGT(cgtu_vgt_corr[0], cgtu_vgt_corr[1]);
		}
		
		// Print correction
		CGTU_PrintGateCal();
	}
}

function CGTU_LineResistanceCalc()
{
	var cgtu_dv_sum = 0;
	var cgtu_igt_sum = 0;
	var cgtu_rline = 0;
	
	dev.w(95,0);
	
	// Collect data
	if (CGTU_CollectGate(cgtu_Iterations))
	{
		for (i=0; i<cgtu_vgt.length; i++)
		{
			cgtu_dv_sum += cgtu_vgt[i] - cgtu_vgt_sc[i];
			cgtu_igt_sum += Math.round(cgtu_igt_sc[i]);
		}
		
		cgtu_rline = Math.round(cgtu_dv_sum / cgtu_igt_sum * 1000);
		
		print("Line resistance = " + cgtu_rline + "mOhm")
		
		dev.w(95,cgtu_rline);
		dev.c(200);
	}
}

function CGTU_CalibratePower()
{
	// Collect data
	CGTU_ResetA();
	CGTU_ResetPowerCal();
	if (CGTU_CollectPower(cgtu_Iterations))
	{
		CGTU_SavePower("gtu_ih");
		
		// Plot relative error distribution
		scattern(cgtu_ih_sc, cgtu_ih_err, "Ih (in mA)", "Error (in %)", "Ih relative error");
		
		if (CGEN_UseQuadraticCorrection())
		{
			// Calculate correction
			cgtu_ih_corr = CGEN_GetCorrection2("gtu_ih");
			CGTU_CalIH2(cgtu_ih_corr[0], cgtu_ih_corr[1], cgtu_ih_corr[2]);
		}
		else
		{
			// Calculate correction
			cgtu_ih_corr = CGEN_GetCorrection("gtu_ih");
			CGTU_CalIH(cgtu_ih_corr[0], cgtu_ih_corr[1]);
		}
		
		// Print correction
		CGTU_PrintPowerCal();
	}
}

function CGTU_VerifyGate()
{
	// Collect corrected data
	CGTU_ResetA();
	if (CGTU_CollectGate(cgtu_Iterations))
	{
		CGTU_SaveGate("gtu_igt_fixed", "gtu_vgt_fixed");
		
		// Plot relative error distribution
		scattern(cgtu_igt_sc, cgtu_igt_err, "Igt (in mA)", "Error (in %)", "Igt relative error"); sleep(200);
		scattern(cgtu_vgt_sc, cgtu_vgt_err, "Vgt (in mV)", "Error (in %)", "Vgt relative error"); sleep(200);
		
		// Plot summary error distribution
		scattern(cgtu_igt_sc, cgtu_igt_err_sum, "Igt (in mA)", "Error (in %)", "Igt summary error"); sleep(200);
		scattern(cgtu_vgt_sc, cgtu_vgt_err_sum, "Vgt (in mV)", "Error (in %)", "Vgt summary error");
	}
}

function CGTU_VerifyPower()
{
	// Collect corrected data
	CGTU_ResetA();
	if (CGTU_CollectPower(cgtu_Iterations))
	{
		CGTU_SavePower("gtu_ih_fixed");
		
		// Plot relative error distribution
		scattern(cgtu_ih_sc, cgtu_ih_err, "Ih (in mA)", "Error (in %)", "Ih relative error");
		scattern(cgtu_ih_sc, cgtu_ih_err_sum, "Ih (in mA)", "Error (in %)", "Ih summary error");
	}
}

function CGTU_CollectGate(IterationsCount)
{
	cgtu_CurrentValues = CGEN_GetRange(cgtu_Imin, cgtu_Imax, cgtu_Istp);

	print("Gate resistance set to " + cgtu_ResGate + " Ohms");
	print("-----------");
	return CGTU_Collect(110, cgtu_ResGate, cgtu_CurrentValues, IterationsCount);
}

function CGTU_CollectPower(IterationsCount)
{
	cgtu_CurrentValues = CGEN_GetRange(cgtu_Imin, cgtu_Imax, cgtu_Istp);

	print("Power resistance set to " + cgtu_ResPower + " Ohms");
	print("-----------");
	return CGTU_Collect(111, cgtu_ResPower, cgtu_CurrentValues, IterationsCount);
}

function CGTU_Collect(ProbeCMD, Resistance, cgtu_CurrentValues, IterationsCount)
{	
	cgtu_cntTotal = IterationsCount * cgtu_CurrentValues.length;
	cgtu_cntDone = 0;
	
	// Init trigger
	TEK_TriggerPulseInit((ProbeCMD == 110) ? cgtu_chMeasureGate : cgtu_chMeasurePower, "1");
	CGTU_TriggerTune();
	
	// Configure scale
	CGTU_TekScale((ProbeCMD == 110) ? cgtu_chMeasureGate : cgtu_chMeasurePower, cgtu_Imax * Resistance / 1000);
	sleep(500);
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < cgtu_CurrentValues.length; j++)
		{
			if (cgtu_UseRangeTuning)
				CGTU_TekScale((ProbeCMD == 110) ? cgtu_chMeasureGate : cgtu_chMeasurePower, cgtu_CurrentValues[j] * Resistance / 1000);
			
			// Configure trigger
			TEK_TriggerLevelF(cgtu_CurrentValues[j] * Resistance / (1000 * 2));
			sleep(1000);
			
			// Configure GTU
			dev.w(140, cgtu_CurrentValues[j]);
			CGTU_Probe(ProbeCMD);
			
			if (anykey()) return 0;
		}
	}
	
	return 1;
}

function CGTU_Probe(ProbeCMD)
{
	// Acquire mode
	var AvgNum;
	if (cgtu_UseAvg)
	{
		AvgNum = 4;
		TEK_AcquireAvg(AvgNum);
	}
	else
	{
		AvgNum = 1;
		TEK_AcquireSample();
	}
	sleep(500);
	
	for (var i = 0; i < (cgtu_UseAvg ? (AvgNum + 1) : 1); i++)
	{
		dev.c(ProbeCMD);
		while (dev.r(192) != 0) sleep(50);
		sleep(500);
	}
	
	sleep(1000);
	
	var f = CGTU_Measure((ProbeCMD == 110) ? cgtu_chMeasureGate : cgtu_chMeasurePower);
	
	if (ProbeCMD == 110)
	{
		var igt = dev.r(204);
		var vgt = dev.r(205);
		var igt_sc = (f / cgtu_ResGate).toFixed(1);
		var vgt_sc = f;
		
		// gtu data
		cgtu_igt.push(igt);
		cgtu_vgt.push(vgt);
		// tektronix data
		cgtu_igt_sc.push(igt_sc);
		cgtu_vgt_sc.push(vgt_sc);
		// relative error
		cgtu_igt_err.push(((igt - igt_sc) / igt_sc * 100).toFixed(2))
		cgtu_vgt_err.push(((vgt - vgt_sc) / vgt_sc * 100).toFixed(2))
		// Summary error
		E0 = Math.sqrt(Math.pow(EUosc, 2) + Math.pow(ER, 2));
		cgtu_igt_err_sum.push(1.1 * Math.sqrt(Math.pow((igt - igt_sc) / igt_sc * 100, 2) + Math.pow(E0, 2)));
		cgtu_vgt_err_sum.push(1.1 * Math.sqrt(Math.pow((vgt - vgt_sc) / vgt_sc * 100, 2) + Math.pow(E0, 2)));
	}
	else
	{
		var ih = dev.r(204);
		var ih_sc = (f / cgtu_ResPower).toFixed(1);		
		
		cgtu_ih.push(ih);
		cgtu_ih_sc.push(ih_sc);
		cgtu_ih_err.push(((ih_sc - ih) / ih_sc * 100).toFixed(2));
		
		// Summary error
		E0 = Math.sqrt(Math.pow(EUosc, 2) + Math.pow(ER, 2));
		cgtu_ih_err_sum.push(1.1 * Math.sqrt(Math.pow(((ih_sc - ih) / ih_sc).toFixed(2) * 100, 2) + Math.pow(E0, 2)));
	}
	
	print("Iset, mA: " + dev.r(140));
	if (ProbeCMD == 110)
	{
		print("Igt,  mA: " + dev.r(204));
		print("Vgt,  mV: " + dev.r(205));
	}
	else
		print("Ih,   mA: " + dev.r(204));
	print("Tek,  mV: " + f);
	
	cgtu_cntDone++;
	print("-- result " + cgtu_cntDone + " of " + cgtu_cntTotal + " --");
	
	sleep(500);
}

function CGTU_Init(portGate, portTek, channelMeasureGate, channelMeasurePower)
{
	if (channelMeasureGate < 1 || channelMeasureGate > 4 ||
		channelMeasurePower < 1 || channelMeasurePower > 4)
	{
		print("Wrong channel numbers");
		return;
	}
	
	// Copy channel information
	cgtu_chMeasureGate = channelMeasureGate;
	cgtu_chMeasurePower = channelMeasurePower;
	
	// Init GTU
	dev.Disconnect();
	dev.Connect(portGate);
	
	// Init Tektronix
	TEK_PortInit(portTek);
	
	// Tektronix init
	// Init channels
	TEK_ChannelInit(cgtu_chMeasureGate, "1", "1");
	TEK_ChannelInit(cgtu_chMeasurePower, "1", "1");
	// Init trigger
	TEK_TriggerPulseInit(cgtu_chMeasureGate, "1");
	CGTU_TriggerTune();
	// Horizontal settings
	TEK_Horizontal("10e-3", "-40e-3");
	
	// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == cgtu_chMeasureGate || i == cgtu_chMeasurePower)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
	
	// Init measurement
	CGTU_TekCursor(cgtu_chMeasureGate);
	CGTU_TekCursor(cgtu_chMeasurePower);
}

function CGTU_TriggerTune()
{
	TEK_Send("trigger:main:pulse:width:polarity negative");
	TEK_Send("trigger:main:pulse:width:width 50e-3");
}

function CGTU_TekCursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send("cursor:vbars:position1 -60e-3");
	TEK_Send("cursor:vbars:position2 0");
}

function CGTU_TekScale(Channel, Value)
{
	TEK_ChannelScale(Channel, Value);
}

function CGTU_Measure(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	sleep(500);
	
	var f = TEK_Exec("cursor:vbars:hpos1?");
	if (Math.abs(f) > 2e+4)
		f = 0;
	return Math.round(f * 1000);
}

function CGTU_ResetA()
{
	// Results storage
	cgtu_igt = [];
	cgtu_vgt = [];
	cgtu_ih = [];

	// Tektronix data
	cgtu_igt_sc = [];
	cgtu_vgt_sc = [];
	cgtu_ih_sc = [];

	// Relative error
	cgtu_igt_err = [];
	cgtu_vgt_err = [];
	cgtu_ih_err = [];
	
	// Summary error
	cgtu_igt_err_sum = [];
	cgtu_vgt_err_sum = [];
	cgtu_ih_err_sum = [];

	// Correction
	cgtu_igt_corr = [];
	cgtu_vgt_corr = [];
	cgtu_ih_corr = [];
}

function CGTU_SaveGate(NameIGT, NameVGT)
{
	CGEN_SaveArrays(NameIGT, cgtu_igt, cgtu_igt_sc, cgtu_igt_err, cgtu_igt_err_sum);	
	CGEN_SaveArrays(NameVGT, cgtu_vgt, cgtu_vgt_sc, cgtu_vgt_err, cgtu_vgt_err_sum);
}

function CGTU_SavePower(NameIH)
{
	CGEN_SaveArrays(NameIH, cgtu_ih, cgtu_ih_sc, cgtu_ih_err, cgtu_ih_err_sum);
}

function CGTU_CalIGT(K, Offset)
{
	dev.w(50, Math.round(K * 1000));
	dev.w(51, 1000);
	dev.ws(57, Math.round(Offset));
}

function CGTU_CalIGT2(P2, P1, P0)
{
	dev.ws(50, Math.round(P2 * 1e6));
	dev.w(51, Math.round(P1 * 1000));
	dev.ws(57, Math.round(P0));
}

function CGTU_CalVGT(K, Offset)
{
	dev.w(52, Math.round(K * 1000));
	dev.w(53, 1000);
	dev.ws(56, Math.round(Offset));
}

function CGTU_CalVGT2(P2, P1, P0)
{
	dev.ws(52, Math.round(P2 * 1e6));
	dev.w(53, Math.round(P1 * 1000));
	dev.ws(56, Math.round(P0));
}

function CGTU_CalIH(K, Offset)
{
	dev.w(33, Math.round(K * 1000));
	dev.w(34, 1000);
	dev.ws(35, Math.round(Offset));
}

function CGTU_CalIH2(P2, P1, P0)
{
	dev.ws(33, Math.round(P2 * 1e6));
	dev.w(34, Math.round(P1 * 1000));
	dev.ws(35, Math.round(P0));
}

function CGTU_PrintGateCal()
{
	if (CGEN_UseQuadraticCorrection())
	{
		print("IGT P2 x1e6:	" + dev.rs(50));
		print("IGT P1 x1000:	" + dev.r(51));
		print("IGT P0:		" + dev.rs(57));
		
		print("VGT P2 x1e6:	" + dev.rs(52));
		print("VGT P1 x1000:	" + dev.r(53));
		print("VGT P0:		" + dev.rs(56));
	}
	else
	{
		print("IGT K:		" + (dev.r(50) / dev.r(51)));
		print("IGT Offset:	" + dev.rs(57));
		print("VGT K:		" + (dev.r(52) / dev.r(53)));
		print("VGT Offset:	" + dev.rs(56));
	}
}

function CGTU_PrintPowerCal()
{
	if (CGEN_UseQuadraticCorrection())
	{
		print("IH  P2 x1e6:	" + dev.rs(33));
		print("IH  P1 x1000:	" + dev.r(34));
		print("IH  P0:		" + dev.rs(35));
	}
	else
	{
		print("IH  K:		" + (dev.r(33) / dev.r(34)));
		print("IH  Offset:	" + dev.rs(35));
	}
}

function CGTU_ResetGateCal()
{
	if (CGEN_UseQuadraticCorrection())
	{
		CGTU_CalIGT2(0, 1, 0);
		CGTU_CalVGT2(0, 1, 0);
	}
	else
	{
		CGTU_CalIGT(1, 0);
		CGTU_CalVGT(1, 0);
	}
	
	dev.w(95, 0);
}

function CGTU_ResetPowerCal()
{
	if (CGEN_UseQuadraticCorrection())
		CGTU_CalIH2(0, 1, 0);
	else
		CGTU_CalIH(1, 0);
}
