include("TestSL.js")
include("Tektronix.js")
include("CalGeneral.js")

// Current shunt resistance
csl_ShuntRes = 0;		// in mOhms (read from block)
csl_ForceShuntRes = 0;	// force shunt resistance (in mOhms)
// DUT resistance
csl_DUTRes = 1;			// in mOhms
csl_DUTConst = 0;		// in mV
//
csl_UseAvg = 1;
csl_UseRangeTuning = 1;
//
csl_lsl_Enable = 1;
csl_lsl_RangeI = 1;

// Current ranges
// 
// Calibrate I 
csl_Imin = 300;			// in A
csl_Imax = 4000;		// in A
csl_Istp = 250;			// in A

csl_ImaxV = 0;			// in A 

// Calibrate V
csl_Vmax = 4000;
csl_Vfsmax = 3500;

// Counters
csl_cntTotal = 0;
csl_cntDone = 0;

// Results storage
csl_v = [];
csl_i = [];
csl_i_set = [];

// Tektronix data
csl_v_sc = [];
csl_i_sc = [];

// Relative error
csl_v_err = [];
csl_i_err = [];
csl_iset_err = [];

// Summary error
csl_v_err_sum = [];
csl_i_err_sum = [];
csl_iset_err_sum = [];

// Correction
csl_v_corr = [];
csl_i_corr = [];
csl_iset_corr = [];

csl_chMeasureV = 1;
csl_chMeasureI = 1;

// Iterations
csl_Iterations = 1;

// Measurement errors
EUosc = 3;
ER = 1;
E0 = 0;

function CSL_CalibrateI()
{
	// Collect data
	CSL_ResetA();
	CSL_ResetICal();
	
	// Configure
	dev.w(162, 1);
	var CurrentArray = CGEN_GetRange(csl_Imin, csl_Imax, csl_Istp);
	
	if (CSL_Collect(CurrentArray, 0, csl_Iterations))
	{
		CSL_SaveI("sl_i");
		
		// Plot relative error distribution
		scattern(csl_i_sc, csl_i_err, "Current (in A)", "Error (in %)", "Current relative error");
		
		if (CGEN_UseQuadraticCorrection())
		{
			// Calculate correction
			csl_i_corr = CGEN_GetCorrection2("sl_i");
			CSL_CalI2(csl_i_corr[0], csl_i_corr[1], csl_i_corr[2]);
		}
		else
		{
			// Calculate correction
			csl_i_corr = CGEN_GetCorrection("sl_i");
			CSL_CalI2(csl_i_corr[0], csl_i_corr[1]);
		}
		
		// Print correction
		CSL_PrintICal();
	}
}

function CSL_CalibrateIset()
{
	// Collect data
	CSL_ResetA();
	CSL_ResetIsetCal();
	
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

function CSL_CalibrateV()
{
	// Collect data
	CSL_ResetA();
	CSL_ResetVCal();
	
	// Configure
	dev.w(162, 0);
	
	csl_ImaxV = Math.round((csl_Vmax - csl_DUTConst) / csl_DUTRes);
	if (csl_ImaxV > csl_Imax)
		csl_ImaxV = csl_Imax;
	else if (csl_ImaxV < csl_Imin)
		csl_ImaxV = csl_Imin;
	
	csl_Istp = Math.round((csl_ImaxV - csl_Imin) / 10);
	var CurrentArray = CGEN_GetRange(csl_Imin, csl_ImaxV, csl_Istp);
	
	if (CSL_Collect(CurrentArray, 1, csl_Iterations))
	{
		CSL_SaveV("sl_v");
		
		// Plot relative error distribution
		scattern(csl_v_sc, csl_v_err, "Voltage (in mV)", "Error (in %)", "Voltage relative error");
		
		if (CGEN_UseQuadraticCorrection())
		{
			// Calculate correction
			csl_v_corr = CGEN_GetCorrection2("sl_v");
			CSL_CalV2(csl_v_corr[0], csl_v_corr[1], csl_v_corr[2]);
		}
		else
		{
			// Calculate correction
			csl_v_corr = CGEN_GetCorrection("sl_v");
			CSL_CalV(csl_v_corr[0], csl_v_corr[1]);
		}
		
		// Print correction
		CSL_PrintVCal();
	}
}

function CSL_CalibrateVfs()
{
	// Collect data
	CSL_ResetA();
	CSL_ResetVfsCal();
	
	// Reload values
	dev.w(162, 1);
	
	csl_ImaxV = Math.round((csl_Vfsmax - csl_DUTConst) / csl_DUTRes);
	if (csl_ImaxV > csl_Imax)
		csl_ImaxV = csl_Imax;
	else if (csl_ImaxV < csl_Imin)
		csl_ImaxV = csl_Imin;
	
	csl_Istp = Math.round((csl_ImaxV - csl_Imin) / 10);
	var CurrentArray = CGEN_GetRange(csl_Imin, csl_ImaxV, csl_Istp);
	
	if (CSL_Collect(CurrentArray, 1, csl_Iterations))
	{
		CSL_SaveV("sl_vfs");
		
		// Plot relative error distribution
		scattern(csl_v_sc, csl_v_err, "Voltage FS (in mV)", "Error (in %)", "Voltage FS relative error");
		
		if (CGEN_UseQuadraticCorrection())
		{
			// Calculate correction
			csl_v_corr = CGEN_GetCorrection2("sl_vfs");
			CSL_CalVfs2(csl_v_corr[0], csl_v_corr[1], csl_v_corr[2]);
		}
		else
		{
			// Calculate correction
			csl_v_corr = CGEN_GetCorrection("sl_vfs");
			CSL_CalVfs(csl_v_corr[0], csl_v_corr[1]);
		}
		
		// Print correction
		CSL_PrintVfsCal();
	}
}

function CSL_VerifyI()
{
	// Collect data
	CSL_ResetA();
	
	// Reload values
	dev.w(162, 1);
	var CurrentArray = CGEN_GetRange(csl_Imin, csl_Imax, csl_Istp);
	
	if (CSL_Collect(CurrentArray, 0, csl_Iterations))
	{
		CSL_SaveI("sl_i_fixed");
		
		// Plot relative error distribution
		scattern(csl_i_sc, csl_i_err, "Current (in A)", "Error (in %)", "Current relative error");
		
		// Plot summary error distribution
		scattern(csl_i_sc, csl_i_err_sum, "Current (in A)", "Error (in %)", "Current summary error");
	}
}

function CSL_VerifyIset()
{
	// Collect data
	CSL_ResetA();
	
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

function CSL_VerifyV()
{
	// Collect data
	CSL_ResetA();
	
	// Reload values
	dev.w(162, 0);
	csl_ImaxV = Math.round((csl_Vmax - csl_DUTConst) / csl_DUTRes);
	if (csl_ImaxV > csl_Imax)
		csl_ImaxV = csl_Imax;
	else if (csl_ImaxV < csl_Imin)
		csl_ImaxV = csl_Imin;
	
	csl_Istp = Math.round((csl_ImaxV - csl_Imin) / 10);
	var CurrentArray = CGEN_GetRange(csl_Imin, csl_ImaxV, csl_Istp);
	
	if (CSL_Collect(CurrentArray, 1, csl_Iterations))
	{
		CSL_SaveV("sl_v_fixed");
		
		// Plot relative error distribution
		scattern(csl_v_sc, csl_v_err, "Voltage (in mV)", "Error (in %)", "Voltage relative error");
		
		// Plot summary error distribution
		scattern(csl_v_sc, csl_v_err_sum, "Voltage (in mV)", "Error (in %)", "Voltage summary error");
	}
}

function CSL_VerifyVfs()
{
	// Collect data
	CSL_ResetA();
	
	// Reload values
	dev.w(162, 1);
	csl_ImaxV = Math.round((csl_Vfsmax - csl_DUTConst) / csl_DUTRes);
	if (csl_ImaxV > csl_Imax)
		csl_ImaxV = csl_Imax;
	else if (csl_ImaxV < csl_Imin)
		csl_ImaxV = csl_Imin;
	
	csl_Istp = Math.round((csl_ImaxV - csl_Imin) / 10);
	var CurrentArray = CGEN_GetRange(csl_Imin, csl_ImaxV, csl_Istp);
	
	if (CSL_Collect(CurrentArray, 1, csl_Iterations))
	{
		CSL_SaveV("sl_vfs_fixed");
		
		// Plot relative error distribution
		scattern(csl_v_sc, csl_v_err, "Voltage FS (in mV)", "Error (in %)", "Voltage FS relative error");
	}
}

function CSL_Init(portSL, portTek, channelMeasureV, channelMeasureI, channelTrigger)
{
	if (channelMeasureV < 1 || channelMeasureV > 4 ||
		channelMeasureI < 1 || channelMeasureI > 4)
	{
		print("Wrong channel numbers");
		return;
	}
	
	// Copy channel information
	csl_chMeasureV = channelMeasureV;
	csl_chMeasureI = channelMeasureI;
	
	// Init SLH
	dev.Disconnect();
	dev.Connect(portSL);
	
	// Init Tektronix
	TEK_PortInit(portTek);
	
	// Tektronix init
	// Init channels
	TEK_ChannelInit(csl_chMeasureV, "1", "1");
	TEK_ChannelInit(csl_chMeasureI, "1", "1");
	TEK_ChannelInit(channelTrigger, "1", "0.5");
	// Init trigger
	TEK_TriggerInit(channelTrigger, "0.5");
	TEK_Send("trigger:main:edge:slope fall");
	// Horizontal settings
	TEK_Horizontal("2.5e-3", "0");
	
	// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == csl_chMeasureV || i == csl_chMeasureI || i == channelTrigger)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
	
	// Init measurement
	CSL_TekCursor(csl_chMeasureV);
	CSL_TekCursor(csl_chMeasureI);
}

function CSL_Collect(CurrentValues, VoltageMode, IterationsCount)
{
	if (csl_ForceShuntRes)
		csl_ShuntRes = csl_ForceShuntRes;
	else
		csl_ShuntRes = (csl_lsl_Enable) ? (dev.r(4) / 1000) : (dev.r(14) / dev.r(15));
	
	if (csl_lsl_Enable)
		print("LSL current range set to " + csl_lsl_RangeI);
	
	if (VoltageMode)
	{
		print("Device resistance set to " + csl_DUTRes + " mOhms");
		print("Maximum current set to " + csl_ImaxV + " A");
	}
	else
	{
		print("Shunt resistance " + csl_ShuntRes + " mOhms");
		print("Maximum current set to " + csl_Imax + " A");
	}
	print("-----------");
	
	csl_cntTotal = IterationsCount * CurrentValues.length;
	csl_cntDone = 1;
	
	var AvgNum;
	
	if (csl_UseAvg)
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
	if (dev.r(192) == 0) dev.c(1);
	while (dev.r(192) == 3) sleep(100);
	if (dev.r(192) != 4)
	{
		print("Power-up error");
		return 0;
	}
	
	// Acquire mode
	var AvgNum;
	if (csl_UseAvg)
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
	
	CSL_TekScale(csl_chMeasureV, ((VoltageMode ? csl_ImaxV : csl_Imax) * csl_DUTRes + csl_DUTConst) / 1000);
	CSL_TekScale(csl_chMeasureI, (VoltageMode ? csl_ImaxV : csl_Imax) * csl_ShuntRes / 1000);
	sleep(500);
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			if (csl_UseRangeTuning)
			{
				CSL_TekScale(csl_chMeasureV, (CurrentValues[j] * csl_DUTRes + csl_DUTConst) / 1000);
				CSL_TekScale(csl_chMeasureI, CurrentValues[j] * csl_ShuntRes / 1000);
			}
			sleep(1000);
			csl_i_set.push(CurrentValues[j]);
			
			
			dev.w(160, 1);
			sl_print = 0;
			sl_rep = 1;
			for (var k = 0; k < (csl_UseAvg ? (AvgNum + 1) : 1); k++)
				SL_Sin(CurrentValues[j]);
			sl_print = 1;
			
			print("Iset,  A: " + CurrentValues[j]);
			
			// Unit data
			var v_read = dev.r(198);
			var i_read = dev.r(206);
			csl_v.push(v_read);
			csl_i.push(i_read);
			if (VoltageMode)
				print("V,    mV: " + v_read);
			else
				print("I,     A: " + i_read);
			
			// Scope data
			var v_sc = Math.round(CSL_Measure(csl_chMeasureV, 3) * 1000);
			var i_sc = Math.round(CSL_Measure(csl_chMeasureI, 3) / (csl_ShuntRes * 1e-3));
			csl_v_sc.push(v_sc);
			csl_i_sc.push(i_sc);
			if (VoltageMode)
				print("Vtek, mV: " + v_sc);
			else
				print("Itek,  A: " + i_sc);
			
			// Relative error
			csl_v_err.push(((v_read - v_sc) / v_sc * 100).toFixed(2));
			csl_i_err.push(((i_read - i_sc) / i_sc * 100).toFixed(2));
			csl_iset_err.push(((i_sc - CurrentValues[j]) / CurrentValues[j] * 100).toFixed(2));
			
			// Summary error
			E0 = Math.sqrt(Math.pow(EUosc, 2) + Math.pow(ER, 2));
			csl_v_err_sum.push(1.1 * Math.sqrt(Math.pow((v_read - v_sc) / v_sc * 100, 2) + Math.pow(E0, 2)));
			csl_i_err_sum.push(1.1 * Math.sqrt(Math.pow((i_read - i_sc) / i_sc * 100, 2) + Math.pow(E0, 2)));
			csl_iset_err_sum.push(1.1 * Math.sqrt(Math.pow((i_sc - CurrentValues[j]) / CurrentValues[j] * 100, 2) + Math.pow(E0, 2)));
			
			sleep(1000);
			
			print("-- result " + csl_cntDone++ + " of " + csl_cntTotal + " --");
			if (anykey()) return 0;
		}
	}
	
	return 1;
}

function CSL_TekCursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send("cursor:vbars:position1 -5e-3");
	TEK_Send("cursor:vbars:position2 0");
}

function CSL_TekScale(Channel, Value)
{
	TEK_ChannelScale(Channel, Value);
}

function CSL_Measure(Channel, Resolution)
{
	TEK_Send("cursor:select:source ch" + Channel);
	sleep(500);
	
	var f = TEK_Exec("cursor:vbars:hpos2?");
	if (Math.abs(f) > 2e+4)
		f = 0;
	return parseFloat(f).toFixed(Resolution);
}

function CSL_CalcDUT(Current1, Current2, Scale)
{
	dev.w(162, (Scale) ? 1 : 0);
	var a = SL_Sin(Current1);
	var b = SL_Sin(Current2);
	
	csl_DUTRes = (a.v - b.v) / (a.i - b.i);
	csl_DUTConst = Math.round(a.v - a.i * csl_DUTRes / 1000);
	
	print("csl_DUTRes:	" + csl_DUTRes);
	print("csl_DUTConst:	" + csl_DUTConst);
}

function CSL_PrintIsetCal()
{
	print("Setpoint correction");
	print("I P2 x1e6:	" +  dev.rs(11));
	print("I P1 x1000:	" +  dev.r (12));
	print("I P0:		" + (dev.rs(13) / 10));
}

function CSL_PrintICal()
{
	if (CGEN_UseQuadraticCorrection())
	{
		if (csl_lsl_Enable)
		{
			print("Range " + csl_lsl_RangeI + " correction");
			print("I P2 x1e6:	" +  dev.rs(17 + csl_lsl_RangeI * 3));
			print("I P1 x1000:	" +  dev.r (18 + csl_lsl_RangeI * 3));
			print("I P0:		" + (dev.rs(19 + csl_lsl_RangeI * 3) / 10));
		}
		else
		{
			print("I P2 x1e6:	" + dev.rs(18));
			print("I P1 x1000:	" + dev.r(19));
			print("I P0:		" + dev.rs(38));
		}
	}
	else
	{
		print("I K:		" + (dev.r(18) / dev.r(19)));
		print("I Offset: 	" + dev.rs(38));
	}
}

function CSL_PrintVCal()
{
	if (CGEN_UseQuadraticCorrection())
	{
		if (csl_lsl_Enable)
		{
			print("V P2 x1e6:	" + dev.rs(14));
			print("V P1 x1000:	" + dev.r(15));
			print("V P0:		" + (dev.rs(16) / 10));
		}
		else
		{
			print("V P2 x1e6:	" + dev.rs(22));
			print("V P1 x1000:	" + dev.r(23));
			print("V P0:		" + dev.rs(32));
		}
	}
	else
	{
		print("V K:		" + (dev.r(22) / dev.r(23)));
		print("V Offset: 	" + dev.rs(32));
	}
}

function CSL_PrintVfsCal()
{
	if (CGEN_UseQuadraticCorrection())
	{
		print("Vfs P2 x1e6:	" + dev.rs(39));
		print("Vfs P1 x1000:	" + dev.r(40));
		print("Vfs P0:		" + dev.rs(55));
	}
	else
	{
		print("Vfs K:		" + (dev.r(39) / dev.r(40)));
		print("Vfs Offset:	" + dev.rs(55));
	}
}

function CSL_PrintIsetCal()
{
	if (csl_lsl_Enable)
	{
		print("Iset P2 x1e6:	" + dev.rs(11));
		print("Iset P1 x1000:	" + dev.r(12));
		print("Iset P0:	" + (dev.rs(13) / 10));
	}
	else
	{
		print("Iset P2 x1e6:	" + dev.rs(77));
		print("Iset P1 x1000:	" + dev.r(78));
		print("Iset P0:	" + dev.rs(79));
	}
}

function CSL_ResetA()
{
	// Results storage
	csl_v = [];
	csl_i = [];
	csl_i_set = [];

	// Tektronix data
	csl_v_sc = [];
	csl_i_sc = [];

	// Relative error
	csl_v_err = [];
	csl_i_err = [];
	csl_iset_err = [];

	// Correction
	csl_v_corr = [];
	csl_i_corr = [];
	csl_iset_corr = [];
	
	// Summary error
	csl_v_err_sum = [];
	csl_i_err_sum = [];
	csl_iset_err_sum = [];
}

function CSL_SaveV(NameV)
{
	CGEN_SaveArrays(NameV, csl_v, csl_v_sc, csl_v_err, csl_v_err_sum);
}

function CSL_SaveI(NameI)
{
	CGEN_SaveArrays(NameI, csl_i, csl_i_sc, csl_i_err, csl_i_err_sum);
}

function CSL_SaveIset(NameI)
{
	CGEN_SaveArrays(NameI, csl_i_sc, csl_i_set, csl_iset_err);
}

function CSL_ResetIsetCal()
{
	CSL_CalISet(0, 1, 0);
}

function CSL_ResetICal()
{
	if (CGEN_UseQuadraticCorrection())
		CSL_CalI2(0, 1, 0)
	else
		CSL_CalI(1, 0)
}

function CSL_ResetVCal()
{
	if (CGEN_UseQuadraticCorrection())
		CSL_CalV2(0, 1, 0);
	else
		CSL_CalV(1, 0);
}

function CSL_ResetVfsCal()
{
	if (CGEN_UseQuadraticCorrection())
		CSL_CalVfs2(0, 1, 0);
	else
		CSL_CalVfs(1, 0);
}

function CSL_ResetIsetCal()
{
	CSL_CalISet(0, 1, 0);
}

function CSL_CalV(K, Offset)
{
	dev.w(22, Math.round(K * 1000));
	dev.w(23, 1000);
	dev.ws(32, Math.round(Offset));
}

function CSL_CalV2(P2, P1, P0)
{
	if (csl_lsl_Enable)
	{
		dev.ws(14, Math.round(P2 * 1e6));
		dev.w (15, Math.round(P1 * 1000));
		dev.ws(16, Math.round(P0 * 10));
	}
	else
	{
		dev.ws(22, Math.round(P2 * 1e6));
		dev.w (23, Math.round(P1 * 1000));
		dev.ws(32, Math.round(P0));
	}
}

function CSL_CalVfs(K, Offset)
{
	dev.w(39, Math.round(K * 1000));
	dev.w(40, 1000);
	dev.ws(55, Math.round(Offset));
}

function CSL_CalVfs2(P2, P1, P0)
{
	dev.ws(39, Math.round(P2 * 1e6));
	dev.w(40, Math.round(P1 * 1000));
	dev.ws(55, Math.round(P0));
}

function CSL_CalI(K, Offset)
{
	dev.w(18, Math.round(K * 1000));
	dev.w(19, 1000);
	dev.ws(38, Math.round(Offset));
}

function CSL_CalI2(P2, P1, P0)
{
	if (csl_lsl_Enable)
	{
		dev.ws(17 + csl_lsl_RangeI * 3, Math.round(P2 * 1e6));
		dev.w (18 + csl_lsl_RangeI * 3, Math.round(P1 * 1000));
		dev.ws(19 + csl_lsl_RangeI * 3, Math.round(P0 * 10));
	}
	else
	{
		dev.ws(18, Math.round(P2 * 1e6));
		dev.w (19, Math.round(P1 * 1000));
		dev.ws(38, Math.round(P0));
	}
}

function CSL_CalISet(P2, P1, P0)
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
