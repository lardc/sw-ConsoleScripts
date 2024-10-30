include("TestTOU_HP.js")
include("Tektronix.js")
include("CalGeneral.js")

// Input params
ctou_ud_test = 1500;		// Available - 600V, 1000V, 1500V
ctou_idmax = 100;		// MAX DUT Current [A]
ctou_Ri = 1e-3;			// Current shunt resistance
//
ctou_nid = 11;			// CAN node id
ctou_TOCUHP_nid = 21;	// TOCU HP node id

// Calibrate Id
ctou_idmin = 10;
ctou_idmax = ctou_idmax;
ctou_idstp = 10;

// Calibrate Ud
ctou_id_test = 50;			// Test current [A]
ctou_UdArray = [600, 1000, 1500];

// Counters
ctou_cntTotal = 0;
ctou_cntDone = 0;

// Iterations
ctou_Iterations = 1;

// Channels
ctou_chMeasureId = 1;
ctou_chSync = 2;

ctou_id_array = [];
ctou_ud_array = [];

// Results storage
ctou_id = [];
ctou_id_set = [];
ctou_ud = [];

// Tektronix data
ctou_id_sc = [];
ctou_ud_sc = [];

// Relative error
ctou_id_err = [];
ctou_idset_err = [];
ctou_ud_err = [];

// Correction
ctou_id_corr = [];
ctou_id_set_corr = [];
ctou_ud_corr = [];

ctou_UseAvg = 1;

function CTOU_Init(portTOU, portTek, channelMeasureId, channelMeasureUd, channelSync)
{
	if (channelMeasureId < 1 || channelMeasureId > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	ctou_chMeasureUd = channelMeasureUd;
	ctou_chMeasureId = channelMeasureId;
	ctou_chSync = channelSync;

	// Init TOU
	dev.Disconnect();
	dev.Connect(portTOU);

	// Init Tektronix
	TEK_PortInit(portTek);
}

function CTOU_CalIdbrateId()
{
	dev.nid(ctou_nid);
	
	CTOMU_CommutationControl(0);
	
	// Collect data
	CTOU_ResetA();
	CTOU_ResetIdCal();
	
	// Tektronix init
	CTOU_IdTekInit();

	// Reload values
	var CurrentArray = CGEN_GetRange(ctou_idmin, ctou_idmax, ctou_idstp);

	if (CTOU_IdCollect(CurrentArray, ctou_Iterations))
	{
		CTOU_SaveId("touhp_id");
		CTOU_SaveIdset("touhp_idset");

		// Plot relative error distribution
		scattern(ctou_id_sc, ctou_id_err, "Current (in A)", "Error (in %)", "Current relative error");
		sleep(200);
		scattern(ctou_id_set, ctou_idset_err, "Current (in A)", "Error (in %)", "Current setpoint relative error");

		// Calculate correction
		ctou_id_corr = CGEN_GetCorrection2("touhp_id");
		CTOU_CalId(ctou_id_corr[0], ctou_id_corr[1], ctou_id_corr[2]);
		CTOU_PrintIdCal();
		
		ctou_id_set_corr = CGEN_GetCorrection2("touhp_idset");
		CTOU_CalId_Set(ctou_id_set_corr[0], ctou_id_set_corr[1], ctou_id_set_corr[2]);
		CTOU_PrintIdSetCal();
	}
	
	CTOMU_CommutationControl(1);
}

function CTOU_CalIdbrateUd()
{
	dev.nid(ctou_nid);
	
	CTOMU_CommutationControl(1);
	
	// Collect data
	CTOU_ResetA();
	CTOU_ResetUdCal();
	
	// Tektronix init
	CTOU_UdTekInit();

	if (CTOU_UdCollect(ctou_UdArray, ctou_Iterations))
	{
		CTOU_SaveUd("touhp_ud");

		// Plot relative error distribution
		scattern(ctou_ud, ctou_ud_err, "Voltage (in V)", "Error (in %)", "Volatge setpoint relative error");

		// Calculate correction
		ctou_ud_corr = CGEN_GetCorrection2("touhp_ud");
		CTOU_CalUd(ctou_ud_corr[0], ctou_ud_corr[1], ctou_ud_corr[2]);
		CTOU_PrintUdCal();
	}
}

function CTOU_VerifyId()
{
	dev.nid(ctou_nid);
	
	CTOMU_CommutationControl(0);
	
	// Collect data
	CTOU_ResetA();
	
	// Tektronix init
	CTOU_IdTekInit();

	// Collect data
	var CurrentArray = CGEN_GetRange(ctou_idmin, ctou_idmax, ctou_idstp);
	var ArrayDiag = '# Current array: '
	for(var i = 0; i < CurrentArray.length; i++)
		ArrayDiag += CurrentArray[i] + '; '
	p(ArrayDiag)

	if (CTOU_IdCollect(CurrentArray, ctou_Iterations))
	{
		CTOU_SaveId("tou_i_fixed");
		CTOU_SaveIdset("tou_iset_fixed");

		// Plot relative error distribution
		scattern(ctou_id_sc, ctou_id_err, "Current (in A)", "Error (in %)", "Current relative error");
		sleep(200);
		scattern(ctou_id_set, ctou_idset_err, "Current (in A)", "Error (in %)", "Current setpoint relative error");
	}
	
	CTOMU_CommutationControl(1);
}

function CTOU_VerifyUd()
{	
	dev.nid(ctou_nid);
	
	CTOMU_CommutationControl(1);
	
	// Collect data
	CTOU_ResetA();
	
	// Tektronix init
	CTOU_UdTekInit();

	if (CTOU_UdCollect(ctou_UdArray, ctou_Iterations))
	{
		CTOU_SaveUd("tou_ud_fixed");

		// Plot relative error distribution
		scattern(ctou_ud, ctou_ud_err, "Voltage (in V)", "Error (in %)", "Voltage setpoint relative error");
	}
}

function CTOU_IdTekInit()
{
	// Init channels
	TEK_ChannelInit(ctou_chMeasureId, "1", "0.01");
	TEK_ChannelInit(ctou_chSync, "1", "1");
	// Init trigger
	TEK_TriggerInit(ctou_chSync, "4");
	// Horizontal settings
	TEK_Horizontal("2.5e-6", "7.5e-6");
	
		// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == ctou_chMeasureId || i == ctou_chSync)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}

	CTOU_IdTekCursor(ctou_chMeasureId);
	// Init measurement
	CTOU_Measure(ctou_chMeasureId, "4");
}

function CTOU_UdTekInit()
{
	// Init channels
	TEK_ChannelInit(ctou_chMeasureUd, "1000", "100");
	TEK_ChannelInit(ctou_chSync, "1", "1");
	// Init trigger
	TEK_TriggerInit(ctou_chSync, "4");
	// Horizontal settings
	TEK_Horizontal("2.5e-6", "0");
	
		// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == ctou_chMeasureUd || i == ctou_chSync)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}

	CTOU_UdTekCursor(ctou_chMeasureUd);
	// Init measurement
	CTOU_Measure(ctou_chMeasureUd, "4");
}

function CTOU_IdTekCursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send("cursor:vbars:position1 12.5e-6");
	TEK_Send("cursor:vbars:position2 12.5e-6");
}

function CTOU_UdTekCursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send("cursor:vbars:position1 -2.5e-6");
	TEK_Send("cursor:vbars:position2 -2.5e-6");
}

function CTOU_Measure(Channel, Resolution)
{
	TEK_Send("cursor:select:source ch" + Channel);
	sleep(500);

	var f = TEK_Exec("cursor:vbars:hpos2?");
	if (Math.abs(f) > 2e+4)
		f = 0;
	return parseFloat(f).toFixed(Resolution);
}

function CTOU_IdCollect(CurrentValues, IterationsCount)
{
	ctou_cntTotal = IterationsCount * CurrentValues.length;
	ctou_cntDone = 1;

	var AvgNum;
	if (ctou_UseAvg)
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
			print("-- result " + ctou_cntDone++ + " of " + ctou_cntTotal + " --");
			
			CTOU_TekScale(ctou_chMeasureId, CurrentValues[j] * ctou_Ri);
			TEK_TriggerInit(ctou_chSync, 4);
			sleep(1000);

			var tou_print_copy = tou_print;
			tou_print = 0;
			for (var k = 0; k < AvgNum; k++)
				TOUHP_Measure(ctou_ud_test, CurrentValues[j] * 10);
			tou_print = tou_print_copy;
			
			// Set data
			var id_set = dev.r(129);
			ctou_id_set.push(id_set);
			print("Icalc, A: " + CurrentValues[j]);
			print("Idset, A: " + (id_set / 10));
			
			// Unit data
			var id_read = dev.r(250);
			ctou_id.push(id_read);
			print("Idtou, A: " + id_read);

			// Scope data
			var id_sc = (CTOU_Measure(ctou_chMeasureId, "4") / ctou_Ri * 10).toFixed(0);
			ctou_id_sc.push(id_sc);
			print("Idtek, A: " + id_sc);

			// Relative error
			ctou_idset_err.push(((id_sc - id_set) / id_set * 100).toFixed(2));
			ctou_id_err.push(((id_read - id_sc) / id_sc * 100).toFixed(2));
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CTOU_UdCollect(VoltageValues, IterationsCount)
{
	ctou_cntTotal = IterationsCount * VoltageValues.length;
	ctou_cntDone = 1;

	var AvgNum;
	if (ctou_UseAvg)
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
			print("-- result " + ctou_cntDone++ + " of " + ctou_cntTotal + " --");
			
			CTOU_TekScale(ctou_chMeasureUd, VoltageValues[j]);
			TEK_TriggerInit(ctou_chSync, 4);
			sleep(1500);

			//
			var tou_print_copy = tou_print;
			tou_print = 0;

			for (var k = 0; k < AvgNum; k++)
			{
				TOUHP_Measure(VoltageValues[j], ctou_id_test * 10);
				sleep(1000);
			}
			
			tou_print = tou_print_copy;
			
			// Set data
			var ud = dev.r(128);
			ctou_ud.push(ud);
			print("Ud, A: " + ud);

			// Scope data
			var ud_sc = Math.round(CTOU_Measure(ctou_chMeasureUd, "4"));
			ctou_ud_sc.push(ud_sc);
			print("Idtek, A: " + ud_sc);

			// Relative error
			ctou_ud_err.push(((ud_sc - ud) / ud * 100).toFixed(2));
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CTOU_TekScale(Channel, Value)
{
	Value = Value / 7;
	TEK_Send("ch" + Channel + ":scale " + Value);
}

function CTOU_ResetA()
{
	// Results storage
	ctou_id = [];
	ctou_id_set = [];
	ctou_ud = [];

	// Tektronix data
	ctou_id_sc = [];
	ctou_ud_sc = [];

	// Relative error
	ctou_id_err = [];
	ctou_idset_err = [];
	ctou_ud_err = [];

	// Correction
	ctou_id_corr = [];
	ctou_id_set_corr = [];
	ctou_ud_corr = [];
}

function CTOU_SaveId(NameId)
{
	CGEN_SaveArrays(NameId, ctou_id, ctou_id_sc, ctou_id_err);
}

function CTOU_SaveIdset(NameIdset)
{
	CGEN_SaveArrays(NameIdset, ctou_id_sc, ctou_id_set, ctou_idset_err);
}

function CTOU_SaveUd(NameUd)
{
	CGEN_SaveArrays(NameUd, ctou_ud_sc, ctou_ud, ctou_ud_err);
}

function CTOU_PrintIdSetCal()
{
	var P2, P1, P0;
	
	switch(ctou_ud_test)
	{
		case 600:
			P2 = dev.r(36);
			P1 = dev.r(37);
			P0 = dev.r(38);
			break;
			
		case 1000:
			P2 = dev.r(39);
			P1 = dev.r(40);
			P0 = dev.r(41);
			break;
			
		case 1500:
			P2 = dev.r(42);
			P1 = dev.r(43);
			P0 = dev.r(44);
			break;
	}
	
	print("Id set P2 x1e6 : " + P2);
	print("Id set P1 x1000: " + P1);
	print("Id set P0      : " + P0);
}

function CTOU_PrintIdCal()
{
	print("I P2 x1e6  : " + dev.rs(49));
	print("I P1 x1000 : " + dev.r(48));
	print("I P0 x1000 : " + dev.rs(47));
}

function CTOU_PrintUdCal()
{
	dev.w(180, ctou_TOCUHP_nid);
	
	dev.w(181, 22);
	dev.c(41);
	sleep(10);
	print("Ud P2 x1e6 :	" + dev.rs(182));
	
	dev.w(181, 23);
	dev.c(41);
	sleep(10);
	print("Ud P1 x1000:	" + dev.rs(182));
	
	dev.w(181, 24);
	dev.c(41);
	sleep(10);
	print("Ud P0      : " + dev.rs(182));
}

function CTOU_ResetIdCal()
{
	CTOU_CalId(0, 1, 0);
	CTOU_CalId_Set(0, 1, 0);
}

function CTOU_ResetUdCal()
{
	CTOU_CalUd(0, 1, 0);
}

function CTOU_CalId_Set(P2, P1, P0)
{
	switch(ctou_ud_test)
	{
		case 600:
			dev.ws(36, Math.round(P2 * 1e6));
			dev.w(37, Math.round(P1 * 1000));
			dev.ws(38, Math.round(P0));
			break;
			
		case 1000:
			dev.ws(39, Math.round(P2 * 1e6));
			dev.w(40, Math.round(P1 * 1000));
			dev.ws(41, Math.round(P0));
			break;
			
		case 1500:
			dev.ws(42, Math.round(P2 * 1e6));
			dev.w(43, Math.round(P1 * 1000));
			dev.ws(44, Math.round(P0));
			break;
	}
}

function CTOU_CalId(P2, P1, P0)
{
	dev.ws(49, Math.round(P2 * 1e6));
	dev.w(48, Math.round(P1 * 1000));
	dev.ws(47, Math.round(P0));
}

function CTOU_CalUd(P2, P1, P0)
{
	dev.w(180, ctou_TOCUHP_nid);
	
	dev.w(181, 22);
	dev.ws(182, Math.round(P2 * 1e6));
	dev.c(42);
	
	sleep(10);
	
	dev.w(181, 23);
	dev.w(182, Math.round(P1 * 1000));
	dev.c(42);
	
	sleep(10);
	
	dev.w(181, 24);
	dev.ws(182, Math.round(P0));
	dev.c(42);
	
	sleep(10);
}

function CTOU_CalUdApllySettings()
{
	dev.w(180, ctou_TOCUHP_nid);
	dev.w(183, 200);
	dev.c(40);
	
	sleep(10);
}

function CTOMU_CommutationControl(Control)
{
	if(Control)
	{
		dev.w(14, 0);
		dev.w(190, 0);
		dev.c(21);
		dev.c(22);
	}
	else
		dev.w(14, 1);
}
