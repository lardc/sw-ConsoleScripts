include("TestECDCHighVoltageBoard.js")
include("Tektronix.js")
include("CalGeneral.js")

// Calibration setup parameters
cal_Points = 10;

cal_Rshunt = 50000;
cal_Rload = 5000000;

cal_CurrentRange = 0;	// 0 = 6 - 25uA; 1 = 25 - 250uA; 2 = 250 - 2000uA; 3 = 2 - 20mA;
cal_VoltageRange = 1;	// 0 = 25 - 100V; 1 = 100 - 2000V;

cal_UdMax = [100, 2000];	
cal_UdMin = [25, 99.9];
cal_UdStp = (cal_UdMax[cal_VoltageRange] - cal_UdMin[cal_VoltageRange]) / cal_Points;

cal_IdMin = [6, 24.9, 249.9, 1999.9];	
cal_IdMax = [25, 250, 2000, 20000];
cal_IdStp = (cal_IdMax[cal_CurrentRange] - cal_IdMin[cal_CurrentRange]) / cal_Points;

cal_Iterations = 1;
cal_UseAvg = 1;
//		

// Counters
cal_CntTotal = 0;
cal_CntDone = 0;

// Channels
cal_chMeasureId = 1;
cal_chMeasureUd = 2;
cal_chSync = 3;

// Results storage
cal_Ud = [];
cal_Id = [];

// Tektronix data
cal_UdSc = [];
cal_IdSc = [];

// Relative error
cal_UdErr = [];
cal_IdErr = [];

// Correction
cal_UdCorr = [];
cal_IdCorr = [];

function CAL_Init(portDevice, portTek, channelMeasureId, channelMeasureUd, channelSync)
{
	if (channelMeasureId < 1 || channelMeasureId > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	cal_chMeasureUd = channelMeasureUd;
	cal_chMeasureId = channelMeasureId;
	cal_chSync = channelSync;

	// Init device port
	dev.Disconnect();
	dev.Connect(portDevice);

	// Init Tektronix port
	TEK_PortInit(portTek);
	
	// Tektronix init
	for (var i = 1; i <= 4; i++)
	{
		if ((i == cal_chMeasureUd) || (i == channelMeasureId) || (i == cal_chSync))
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
	TEK_ChannelInit(cal_chSync, "1", "1");
	TEK_TriggerInit(cal_chSync, "2");
	TEK_Horizontal("2.5e-3", "-5e-3");
}
//--------------------

function CAL_CalibrateUd()
{
	CAL_ResetA();
	CAL_ResetUdCal();
	
	ECDC_HV_ExcessCurrentControl(false);
	
	// Tektronix init
	CAL_TekInitUd();
	
	// Reload values
	var VoltageArray = CGEN_GetRange(cal_UdMin[cal_VoltageRange], cal_UdMax[cal_VoltageRange], cal_UdStp);
	
	if (CAL_CollectUd(VoltageArray, cal_Iterations))
	{
		CAL_SaveUd("ECDCHighVoltageBoard_ud");

		// Plot relative error distribution
		scattern(cal_UdSc, cal_UdErr, "Voltage (in V)", "Error (in %)", "Voltage relative error");

		// Calculate correction
		cal_UdCorr = CGEN_GetCorrection2("ECDCHighVoltageBoard_ud");
		CAL_SetCoefUd(cal_UdCorr[0], cal_UdCorr[1], cal_UdCorr[2]);
		CAL_PrintCoefUd();
	}
	
	ECDC_HV_ExcessCurrentControl(true);
}
//--------------------

function CAL_CalibrateId()
{		
	CAL_ResetA();
	CAL_ResetIdCal();
	
	ECDC_HV_ExcessCurrentControl(false);
	
	// Tektronix init
	CAL_TekInitId(cal_chMeasureId);

	// Reload values
	var CurrentArray = CGEN_GetRange(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_IdStp);

	if (CAL_CollectId(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("ECDCHighVoltageBoard_id");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErr, "Current (in uA)", "Error (in %)", "Current relative error");

		// Calculate correction
		cal_IdCorr = CGEN_GetCorrection2("ECDCHighVoltageBoard_id");
		CAL_SetCoefId(cal_IdCorr[0], cal_IdCorr[1], cal_IdCorr[2]);
		CAL_PrintCoefId();
	}
	
	ECDC_HV_ExcessCurrentControl(true);
}
//--------------------

function CAL_VerifyUd()
{
	CAL_ResetA();
	
	ECDC_HV_ExcessCurrentControl(false);
	
	// Tektronix init
	CAL_TekInitUd();
	
	// Reload values
	var VoltageArray = CGEN_GetRange(cal_UdMin[cal_VoltageRange], cal_UdMax[cal_VoltageRange], cal_UdStp);

	if (CAL_CollectUd(VoltageArray, cal_Iterations))
	{
		CAL_SaveUd("ECDCHighVoltageBoard_ud_fixed");

		// Plot relative error distribution
		scattern(cal_UdSc, cal_UdErr, "Voltage (in V)", "Error (in %)", "Voltage relative error");
	}
	
	ECDC_HV_ExcessCurrentControl(true);
}
//--------------------

function CAL_VerifyId()
{		
	CAL_ResetA();
	
	ECDC_HV_ExcessCurrentControl(false);
	
	// Tektronix init
	CAL_TekInitId();

	// Reload values
	var CurrentArray = CGEN_GetRange(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_IdStp);

	if (CAL_CollectId(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("ECDCHighVoltageBoard_id_fixed");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErr, "Current (in uA)", "Error (in %)", "Current relative error");
	}
	
	ECDC_HV_ExcessCurrentControl(true);
}
//--------------------

function CAL_CollectUd(VoltageValues, IterationsCount)
{
	cal_CntTotal = IterationsCount * VoltageValues.length;
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
		for (var j = 0; j < VoltageValues.length; j++)
		{
			print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
			//
			
			ECDC_HV_TekScale(cal_chMeasureUd, VoltageValues[j]);
			TEK_TriggerInit(cal_chSync, 2);
			sleep(1000);
			
			var PrintTemp = ECDC_HV_print;
			ECDC_HV_print = 0;
			
			for (var k = 0; k < AvgNum; k++)
			{
				if(!ECDC_HV_Measure(VoltageValues[j] * 10, cal_IdMax[3] * 100))
					return 0;
			}
			
			ECDC_HV_print = PrintTemp;
			
			// Unit data
			var UdRead = dev.r(200) / 10;
			cal_Ud.push(UdRead);
			print("Udread, V: " + UdRead);

			// Scope data
			var UdSc = CAL_Measure(cal_chMeasureUd).toFixed(1);
			cal_UdSc.push(UdSc);
			print("Udtek,  V: " + UdSc);

			// Relative error
			var UdErr = ((UdRead - UdSc) / UdSc * 100).toFixed(2);
			cal_UdErr.push(UdErr);
			print("Uderr,  %: " + UdErr);
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
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
		for (var j = 0; j < CurrentValues.length; j++)
		{
			print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
			//
			ECDC_HV_TekScale(cal_chMeasureId, CurrentValues[j] * cal_Rshunt / 1000000);
			TEK_TriggerInit(cal_chSync, 2);
			sleep(1000);
			
			var PrintTemp = ECDC_HV_print;
			ECDC_HV_print = 0;
			
			for (var k = 0; k < AvgNum; k++)
			{
				if(!ECDC_HV_Measure(CurrentValues[j] * cal_Rload / 100000, cal_IdMax[cal_CurrentRange] * 100))
					return 0;
			}
			
			ECDC_HV_print = PrintTemp;
			
			// Unit data
			var IdRead = r32(201) / 100;
			cal_Id.push(IdRead);
			print("Idread, uA: " + IdRead);

			// Scope data
			var IdSc = (CAL_Measure(cal_chMeasureId) / cal_Rshunt * 1000000).toFixed(2);
			cal_IdSc.push(IdSc);
			print("Idtek, uA: " + IdSc);

			// Relative error
			var IdErr = ((IdRead - IdSc) / IdSc * 100).toFixed(2);
			cal_IdErr.push(IdErr);
			print("Iderr, %: " + IdErr);
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}
//--------------------

function ECDC_HV_TekScale(Channel, Value)
{
	Value = Value / 7;
	TEK_Send("ch" + Channel + ":scale " + Value);
}
//--------------------

function CAL_TekInitUd()
{
	TEK_ChannelInit(cal_chMeasureUd, "100", "2");
	CAL_TekCursor(cal_chMeasureUd);
}
//--------------------

function CAL_TekInitId()
{
	TEK_ChannelInit(cal_chMeasureId, "1", "1");
	CAL_TekCursor(cal_chMeasureId);
}
//--------------------

function CAL_TekCursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send("cursor:vbars:position1 -5e-3");
	TEK_Send("cursor:vbars:position2 -5e-3");
}
//--------------------

function CAL_TekScale(Channel, Value)
{
	Value = Value / 6;
	TEK_Send("ch" + Channel + ":scale " + Value);
}
//--------------------

function CAL_Measure(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	sleep(500);

	var f = TEK_Exec("cursor:vbars:hpos2?");
	if (Math.abs(f) > 2.7e+8)
		f = 0;
	return parseFloat(f);
}
//--------------------

function CAL_ResetA()
{	
	// Results storage
	cal_Ud = [];
	cal_Id = [];

	// Tektronix data
	cal_UdSc = [];
	cal_IdSc = [];

	// Relative error
	cal_UdErr = [];
	cal_IdErr = [];

	// Correction
	cal_UdCorr = [];
	cal_IdCorr = [];
}
//--------------------

function CAL_SaveUd(NameUd)
{
	CGEN_SaveArrays(NameUd, cal_Ud, cal_UdSc, cal_UdErr);
}
//--------------------

function CAL_SaveId(NameId)
{
	CGEN_SaveArrays(NameId, cal_Id, cal_IdSc, cal_IdErr);
}
//--------------------

function CAL_ResetUdCal()
{
	CAL_SetCoefUd(0, 1, 0);
}
//--------------------

function CAL_ResetIdCal()
{
	CAL_SetCoefId(0, 1, 0);
}
//--------------------

function CAL_SetCoefUd(P2, P1, P0)
{
	switch(cal_VoltageRange)
	{
		case 0:
		{
			dev.ws(41, Math.round(P2 * 1e6));
			dev.w(42, Math.round(P1 * 1000));
			dev.ws(43, Math.round(P0 * 10));
		}
		break;
		
		case 1:
		{
			dev.ws(46, Math.round(P2 * 1e6));
			dev.w(47, Math.round(P1 * 1000));
			dev.ws(48, Math.round(P0 * 10));
		}
		break;
	}
}
//--------------------

function CAL_SetCoefId(P2, P1, P0)
{
	switch(cal_CurrentRange)
	{	
		case 0:
		{
			dev.ws(51, Math.round(P2 * 1e6));
			dev.w(52, Math.round(P1 * 1000));
			dev.ws(53, Math.round(P0 * 100));
		}
		break;
		
		case 1:
		{
			dev.ws(57, Math.round(P2 * 1e6));
			dev.w(58, Math.round(P1 * 1000));
			dev.ws(59, Math.round(P0 * 100));
		}
		break;
		
		case 2:
		{
			dev.ws(63, Math.round(P2 * 1e6));
			dev.w(64, Math.round(P1 * 1000));
			dev.ws(65, Math.round(P0 * 100));
		}
		break;
		
		case 3:
		{
			dev.ws(69, Math.round(P2 * 1e6));
			dev.w(70, Math.round(P1 * 1000));
			dev.ws(71, Math.round(P0 * 100));
		}
		break;
	}		
}
//--------------------

function CAL_PrintCoefUd()
{
	switch(cal_VoltageRange)
	{
		case 0:
		{
			print("Range 0:")
			print("Ud  P2 x1e6  : " + dev.rs(41));
			print("Ud  P1 x1000 : " + dev.rs(42));
			print("Ud  P0 x10	    : " + dev.rs(43));
		}
		break;
		
		case 1:
		{
			print("Range 1:")
			print("Ud  P2 x1e6  : " + dev.rs(46));
			print("Ud  P1 x1000 : " + dev.rs(47));
			print("Ud  P0 x10	    : " + dev.rs(48));
		}
		break;
	}
}
//--------------------

function CAL_PrintCoefId()
{
	switch(cal_CurrentRange)
	{
		case 0:
		{
			print("Id 0 P2 x1e6		: " + dev.rs(51));
			print("Id 0 P1 x1000	: " + dev.rs(52));
			print("Id 0 P0 x100		: " + dev.rs(53));
		}
		break;
		
		case 1:
		{
			print("Id 1 P2 x1e6		: " + dev.rs(57));
			print("Id 1 P1 x1000	: " + dev.rs(58));
			print("Id 1 P0 x100		: " + dev.rs(59));
		}
		break;
		
		case 2:
		{
			print("Id 2 P2 x1e6		: " + dev.rs(63));
			print("Id 2 P1 x1000	: " + dev.rs(64));
			print("Id 2 P0 x100		: " + dev.rs(65));
		}
		break;
		
		case 3:
		{
			print("Id 3 P2 x1e6		: " + dev.rs(69));
			print("Id 3 P1 x1000	: " + dev.rs(70));
			print("Id 3 P0 x100		: " + dev.rs(71));
		}
		break;
	}
}
//--------------------

