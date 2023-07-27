include("TestECAC.js")
include("Tektronix.js")
include("CalGeneral.js")

// Global definitions
DEV_STATE_INPROCESS = 4
DEV_STATE_INREADY = 3
DEV_STATE_NON = 0
DEV_STATE_DISABLED = 2

// Registers
REG_CURRENT_RANGE1_SAFETY_LIMIT = 181;
REG_CURRENT_RANGE2_SAFETY_LIMIT = 182;
REG_CURRENT_RANGE3_SAFETY_LIMIT = 183;

// Input params
cal_VoltageRangeArrayMin = [5000, 46000];				// Min mV values for ranges
cal_VoltageRangeArrayMax = [45000, 330000];				// Max mV values for ranges

cal_CurrentRangeArrayMin = [10, 301, 5001];				// Min uA values for ranges
cal_CurrentRangeArrayMax = [300, 5000, 100000];			// Max uA values for ranges

cal_VoltageRange  = 0;		
cal_CurrentRange  = 0;	
cal_OutLine = 1;	// 0 - nothing line, 1 - POW, 2 - ctrl	
cal_Rload = 1;	
cal_Rshunt = 1;

cal_AvgNum_L = 16;
cal_AvgNum_H = 128;
cal_AvgNum = cal_AvgNum_L;
	
// Counters
cal_cntTotal = 0;
cal_cntDone = 0;

// ID plate. №1 - 105, №2 - 106
cal_Nid = 105;

// Iterations
cal_Iterations = 3;

// Channels
cal_chMeasureId = 0;
cal_chMeasureUd = 0;

// Results storage
cal_id = [];
cal_ud = [];

// Tektronix data
cal_id_sc = [];
cal_ud_sc = [];

// Relative error
cal_id_err = [];
cal_ud_err = [];

// Correction
cal_id_corr = [];
cal_ud_corr = [];

cal_UseAvg = 1;

cal_PrintModeU = 1;
cal_PrintModeI = 2;

cal_WaitTimeVoltageReady = 30 // Seconds
cal_WaitTimeVoltageCollect = 10 // Seconds

cal_NumberOfMeasurements = 10;
//------------------------

function CAL_Init(portDevice, portTek, channelMeasureId, channelMeasureUd)
{
	if (channelMeasureId < 1 || channelMeasureId > 4 ||
		channelMeasureUd < 1 || channelMeasureUd > 4)
	{
		print("Wrong channel numbers");
		return;
	}
	
	// Copy channel information
	cal_chMeasureUd = channelMeasureUd;
	cal_chMeasureId = channelMeasureId;
	
	// Init ECACVoltageBoard
	dev.Disconnect();
	dev.Connect(portDevice);
	
	var DeviceState = dev.r(192);
	if((DeviceState==DEV_STATE_NON)||(DeviceState==DEV_STATE_DISABLED))
	{
		dev.nid(cal_Nid);
		dev.c(1);
		sleep(1000);
	}
	
	// Init Tektronix
	TEK_PortInit(portTek);
	
	// Init channels
	TEK_ChannelOn(cal_chMeasureUd);
	TEK_ChannelOn(cal_chMeasureId);
	
	TEK_ChannelInit(cal_chMeasureUd, "1", "1");
	TEK_ChannelInit(cal_chMeasureId, "1", "1");
}
//------------------------

function CAL_CalibrateUd()
{
	var ud_min	= cal_VoltageRangeArrayMin[cal_VoltageRange];
	var ud_max	= cal_VoltageRangeArrayMax[cal_VoltageRange];
	var ud_stp	= (ud_max - ud_min) / cal_NumberOfMeasurements;
	
	CAL_ResetA();
	CAL_ResetUdCal();
	
	var VoltageArray = CGEN_GetRange(ud_min, ud_max, ud_stp);
	
	if (CAL_Collect(VoltageArray, cal_Iterations, cal_PrintModeU))
	{
		CAL_SaveUd("ECACVoltageBoard_ud");

		// Plot relative error distribution
		scattern(cal_ud_sc, cal_ud_err, "Voltage (in mV)", "Error (in %)", "Voltage relative error");

		// Calculate correction
		cal_ud_corr = CGEN_GetCorrection2("ECACVoltageBoard_ud");
		CAL_SetCoefUd(cal_ud_corr[0], cal_ud_corr[1], cal_ud_corr[2]);
		CAL_PrintCoefUd();
	}	
}
//------------------------

function CAL_CalibrateId()
{
	var ud_max = Math.round((cal_CurrentRangeArrayMax[cal_CurrentRange] * cal_Rload) / 1000);
	var ud_min = Math.round((cal_CurrentRangeArrayMin[cal_CurrentRange] * cal_Rload) / 1000);
	var ud_stp = Math.round((ud_max - ud_min) / cal_NumberOfMeasurements);
	
	CAL_ResetA();
	CAL_ResetIdCal();
	
	CAL_WideCurrentRangeEnable();
	
	var VoltageArray = CGEN_GetRange(ud_min, ud_max, ud_stp);
	
	if (CAL_Collect(VoltageArray, cal_Iterations, cal_PrintModeI))
	{
		CAL_SaveId("ECACVoltageBoard_id");

		// Plot relative error distribution
		scattern(cal_id_sc, cal_id_err, "Current (in uI)", "Error (in %)", "Current relative error");

		// Calculate correction
		cal_id_corr = CGEN_GetCorrection2("ECACVoltageBoard_id");
		CAL_SetCoefId(cal_id_corr[0], cal_id_corr[1], cal_id_corr[2]);
		CAL_PrintCoefId();
	}
	
	CAL_WideCurrentRangeDisable();
}
//------------------------

function CAL_VerifyUd()
{	
	var ud_min	= cal_VoltageRangeArrayMin[cal_VoltageRange];
	var ud_max	= cal_VoltageRangeArrayMax[cal_VoltageRange];
	var ud_stp	= (ud_max - ud_min) / cal_NumberOfMeasurements;
	
	// Collect data
	CAL_ResetA();

	// Reload values
	var VoltageArray = CGEN_GetRange(ud_min, ud_max, ud_stp);

	if (CAL_Collect(VoltageArray, cal_Iterations, cal_PrintModeU))
	{
		CAL_SaveUd("ECACVoltageBoard_ud_fixed");

		// Plot relative error distribution
		scattern(cal_ud_sc, cal_ud_err, "Voltage (in V)", "Error (in %)", "Voltage relative error");
	}
}
//------------------------

function CAL_VerifyId()
{
	var ud_max = Math.round((cal_CurrentRangeArrayMax[cal_CurrentRange] * cal_Rload) / 1000);
	var ud_min = Math.round((cal_CurrentRangeArrayMin[cal_CurrentRange] * cal_Rload) / 1000);
	var ud_stp = Math.round((ud_max - ud_min) / cal_NumberOfMeasurements);
	
	// Collect data
	CAL_ResetA();

	CAL_WideCurrentRangeEnable();
	
	// Reload values
	var VoltageArray = CGEN_GetRange(ud_min, ud_max, ud_stp);

	if (CAL_Collect(VoltageArray, cal_Iterations, cal_PrintModeI))
	{
		CAL_SaveId("ECACVoltageBoard_id_fixed");

		// Plot relative error distribution
		scattern(cal_id_sc, cal_id_err, "Current (in uA)", "Error (in %)", "Current relative error");
	}
	
	CAL_WideCurrentRangeDisable();
}
//------------------------

function CAL_Collect(VoltageValues, IterationsCount, PrintMode)
{
	cal_cntTotal = IterationsCount * VoltageValues.length;
	cal_cntDone = 1;
	
	CAL_MessageAboutParams(PrintMode);
	
	// Init measurement and set trigger	
	if(CAL_SetMeasuringChanellAndTrigger(PrintMode)) return 0;	

	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < VoltageValues.length; j++)
		{
			print("-- result " + cal_cntDone++ + " of " + cal_cntTotal + " --");
			
			p("Voltage set = " + VoltageValues[j] + " mV");
			
			CAL_TekScale(cal_chMeasureUd, VoltageValues[j]);
			CAL_TekScale(cal_chMeasureId, VoltageValues[j] / cal_Rload * cal_Rshunt);
			sleep(1000);
			
			TEK_AcquireSample();
			
			sleep(500);
			
			ECAC_Pulse(VoltageValues[j], cal_CurrentRangeArrayMax[cal_CurrentRange], cal_OutLine);
			
			sleep(100);
			if(CAL_IsDevState() == DEV_STATE_INPROCESS)
			{
				CAL_WaitReadyVoltage();
				
				CAL_SetAvg();
				
				TEK_AcquireAvg(cal_AvgNum);
				
				sleep(500);
				
				CAL_WaitCollect();
				ECAC_Stop();
				sleep(250);
				CAL_Probe(PrintMode);
			}
			else
			{
				p("Device not in process! Operation abort.");
				return 0;
			}
			
			if(anykey()) return 0;
		}
	}
	return 1;
}
//------------------------

function CAL_Probe(PrintMode)
{
	// Unit data
	var ud_read = (r32(200)).toFixed(2);
	cal_ud.push((ud_read / 1000 ).toFixed(2));
	
	var id_read = r32(202).toFixed(2);
	cal_id.push(id_read);	
	
	// Scope data
	var ud_sc = (CAL_MeasureUd(cal_chMeasureUd)).toFixed(2);			
	cal_ud_sc.push((ud_sc / 1000) .toFixed(2));
			
	var id_sc = (CAL_MeasureId(cal_chMeasureId)).toFixed(2);			
	cal_id_sc.push(id_sc);	
	
	// Relative error
	var ud_err = ((ud_read - ud_sc) / ud_sc * 100).toFixed(2);
	cal_ud_err.push(ud_err);
	
	var id_err = ((id_read - id_sc) / id_sc * 100).toFixed(2);
	cal_id_err.push(id_err);
	
	switch (PrintMode)
	{
		case 1:
			print("Udread, mV: " + ud_read);
			print("Udtek, mV: " + ud_sc);
			print("Uderr, %: " + ud_err);
			print("---------------------");
			break;
		
		case 2:
			print("Idread, uA: " + id_read);
			print("Idtek, uA: " + id_sc);
			print("Iderr, %: " + id_err);
			print("---------------------");
			break;
	}
}
//------------------------

function CAL_TekMeasurement(Channel, TriggerLevel)
{
	TEK_Send("measurement:meas" + Channel + ":source ch" + Channel);
	TEK_Send("measurement:meas" + Channel + ":type crms");
	TEK_TriggerInit(Channel, TriggerLevel);
}
//------------------------

function CAL_MeasureUd(Channel)
{
	var f = TEK_Measure(Channel);
	if (Math.abs(f) > 2e+4)
		f = 0;
	return Math.round(f * 1000);
}
//------------------------

function CAL_MeasureId(Channel)
{
	var f = TEK_Measure(Channel);
	if (Math.abs(f) > 2e+4)
		f = 0;
	return f / cal_Rshunt * 1000000;
}
//------------------------

function CAL_TekScale(Channel, Value)
{
	Value = Value / 1000;
	TEK_Send("ch" + Channel + ":scale " + Value);
}
//------------------------

function CAL_ResetA()
{	
	// Results storage
	cal_id = [];
	cal_ud = [];

	// Tektronix data
	cal_id_sc = [];
	cal_ud_sc = [];

	// Relative error
	cal_id_err = [];
	cal_ud_err = [];

	// Correction
	cal_id_corr = [];
	cal_ud_corr = [];
}
//------------------------

function CAL_SaveId(NameId)
{
	CGEN_SaveArrays(NameId, cal_id, cal_id_sc, cal_id_err);
}
//------------------------

function CAL_SaveUd(NameUd)
{
	CGEN_SaveArrays(NameUd, cal_ud, cal_ud_sc, cal_ud_err);
}
//------------------------

function CAL_PrintCoefUd()
{
	switch(cal_VoltageRange)
	{
		case 0:
		{
			print("Ud range U1 P0 x1000: " + dev.rs(43));
			print("Ud range U1 P1 x1000 : " + dev.rs(42));
			print("Ud range U1 P2 x1e6 : " + dev.rs(41));
		}
		break;
		
		case 1:
		{
			print("Ud range U2 P0 x1000: " + dev.rs(46));
			print("Ud range U2 P1 x1000: " + dev.rs(45));
			print("Ud range U2 P2 x1e6: " + dev.rs(44));
		}
		break;
	}
}
//------------------------

function CAL_PrintCoefId()
{
	switch(cal_CurrentRange)
	{
		case 0:
		{
			print("Id range I1 P0 x1000: " + dev.rs(49));
			print("Id range I1 P1 x1000 : " + dev.rs(48));
			print("Id range I1 P2 x1e6 : " + dev.rs(47));
		}
		break;
		
		case 1:
		{
			print("Id range I2 P0 x1000: " + dev.rs(52));
			print("Id range I2 P1 x1000 : " + dev.rs(51));
			print("Id range I2 P2 x1e6 : " + dev.rs(50));
		}
		break;
		
		case 2:
		{
			print("Id range I3 P0: " + dev.rs(55));
			print("Id range I3 P1 x1000 : " + dev.rs(54));
			print("Id range I3 P2 x1e6 : " + dev.rs(53));
		}
		break;
	}
}
//------------------------

function CAL_ResetUdCal()
{
	CAL_SetCoefUd(0, 1, 0);
}
//------------------------

function CAL_ResetIdCal()
{
	CAL_SetCoefId(0, 1, 0);
}
//------------------------

function CAL_SetCoefUd(P2, P1, P0)
{
	switch(cal_VoltageRange)
	{
		case 0:
		{
			dev.ws(43, Math.round(P0 * 1000));
			dev.w(42, Math.round(P1 * 1000));
			dev.ws(41, Math.round(P2 * 1e6));
		}
		break;
		
		case 1:
		{
			dev.ws(46, Math.round(P0 * 1000));
			dev.w(45, Math.round(P1 * 1000));
			dev.ws(44, Math.round(P2 * 1e6));
		}
		break;
	}
}
//------------------------

function CAL_SetCoefId(P2, P1, P0)
{
	switch(cal_CurrentRange)
	{
		case 0:
		{
			dev.ws(49, Math.round(P0 * 1000));
			dev.w(48, Math.round(P1 * 1000));
			dev.ws(47, Math.round(P2 * 1e6));
		}
		break;
		
		case 1:
		{
			dev.ws(52, Math.round(P0 * 1000));
			dev.w(51, Math.round(P1 * 1000));
			dev.ws(50, Math.round(P2 * 1e6));
		}
		break;
		
		case 2:
		{
			dev.ws(55, Math.round(P0));
			dev.w(54, Math.round(P1 * 1000));
			dev.ws(53, Math.round(P2 * 1e6));
		}
		break;	
	}	
}
//------------------------

function CAL_WaitReadyVoltage()
{
	var k;
	for(k = 0; k < cal_WaitTimeVoltageReady; k ++) 
	{
		sleep(1000);
		if(CAL_IsRedyVoltage())
		{
			break;
		}
	}
	
	if(k >= (cal_WaitTimeVoltageReady - 1))
	{
		p("Voltage ready is time out!");
	}
}
//------------------------
function CAL_WideCurrentRangeEnable()
{
	dev.w(REG_CURRENT_RANGE1_SAFETY_LIMIT, 15);
	dev.w(REG_CURRENT_RANGE2_SAFETY_LIMIT, 15);
	dev.w(REG_CURRENT_RANGE3_SAFETY_LIMIT, 15);
}
//------------------------

function CAL_WideCurrentRangeDisable()
{
	dev.w(REG_CURRENT_RANGE1_SAFETY_LIMIT, 0);
	dev.w(REG_CURRENT_RANGE2_SAFETY_LIMIT, 0);
	dev.w(REG_CURRENT_RANGE3_SAFETY_LIMIT, 0);
}
//------------------------

function CAL_IsRedyVoltage()
{
	var RegisterVoltageReady = 204;
	return dev.r(RegisterVoltageReady);
}
//------------------------

function CAL_IsDevState()
{
	var RegisterState = 192;
	return dev.r(RegisterState);
}
//------------------------

function CAL_WaitCollect()
{
	for(var k = 0; k < cal_WaitTimeVoltageCollect; k++) 
	{
		sleep(1000);
	}
}
//------------------------

function CAL_SetMeasuringChanellAndTrigger(PrintMode)
{
	// Horizontal settings
	TEK_Horizontal("5e-3", 0);
	
	if(PrintMode == cal_PrintModeU)
	{	
		TEK_ChannelOff(cal_chMeasureId);
		TEK_ChannelOn(cal_chMeasureUd);
		TEK_ChannelInit(cal_chMeasureUd, "100", "1");
		TEK_Send("ch" + cal_chMeasureUd + ":position 1");
		CAL_TekMeasurement(cal_chMeasureUd, "5");
		if(CAL_WaitUserAction("To measure Voltage, connect HV voltage probe (x100) to chanell " + cal_chMeasureUd + " oscilloscope.")) return 0;
	}
	
	if(PrintMode == cal_PrintModeI)
	{	
		TEK_ChannelOff(cal_chMeasureUd);
		TEK_ChannelOn(cal_chMeasureId);
		if(cal_CurrentRange == 0)
		{
			TEK_ChannelInit(cal_chMeasureId, "100", "1");
			TEK_Send("ch" + cal_chMeasureId + ":position -1");
			CAL_TekMeasurement(cal_chMeasureId, "0.1");
			if(CAL_WaitUserAction("To measure Current in LOW range, connect HV voltage probe (x100) to chanell " + cal_chMeasureId + " oscilloscope.")) return 0;
		}
		else
		{
			TEK_ChannelInit(cal_chMeasureId, "1", "1");
			TEK_Send("ch" + cal_chMeasureId + ":position -1");
			CAL_TekMeasurement(cal_chMeasureId, "0.01");
			if(CAL_WaitUserAction("To measure Current in MIDDLE or HIGH, connect voltage probe (x1) to chanell " + cal_chMeasureId + " oscilloscope.")) return 0;
		}
	}
	
	sleep(500);
	
	return 1;
}
//------------------------

function CAL_MessageAboutParams(PrintMode)
{
	p("Start measurement with next parameters:");
	if(PrintMode == cal_PrintModeU)
	{		
		p("Voltage range " + cal_VoltageRangeArrayMin[cal_VoltageRange] + " ... " + cal_VoltageRangeArrayMax[cal_VoltageRange] + " mV");
	}
	
	if(PrintMode == cal_PrintModeI)
	{	
		p("Current range " + cal_CurrentRangeArrayMin[cal_CurrentRange] + " ... " + cal_CurrentRangeArrayMax[cal_CurrentRange] + " uA");
		p("Rload = " + cal_Rload + " Ohm");
		p("Rshunt = " + cal_Rshunt + " Ohm");
	}
	sleep(250);
}
//------------------------

function CAL_WaitUserAction(TextMessage)
{
	p("Attention !!!");
	p(TextMessage);
	p("Press key 'y' to start measure, exit pressing 'n'.");
	
	var key = 0;
	do
	{
		key = readkey();
	}
	while (key != "y" && key != "n")
	
	if (key == "n")
	{
		print("Measuring is stopped!");
		return 0;
	}
	return 1;
}
//------------------------

function CAL_SetAvg()
{
	if(cal_CurrentRange>0)
	{
		cal_AvgNum = cal_AvgNum_L;
	}
	else
	{
		cal_AvgNum = cal_AvgNum_H;
	}
	
	TEK_AcquireAvg(cal_AvgNum);
}