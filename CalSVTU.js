include("TestSVTU.js")
include("Tektronix.js")
include("CalGeneral.js")
include("DMM6500.js")
// include("Numeric.js")

// Calibration setup parameters
CAL_Rshunt = 750;					// in uOhms
CAL_Rload = 3527;		     		// in uOhms
CAL_GateRshunt = 10000;				// in mOhms

// Setup parameters for DMM6000
CAL_V_PulsePlate 	= 1000 			// in us
CAL_V_TriggerDelay	= 0				// in s
CAL_measuring_device = "DMM6000";	// "DMM6000" or "TPS2000"

// Current range number
CAL_CurrentRange = 0;				// 0 = Range [ < 300 A]; 1 = Range [ < 1700 A] for measure
//
CAL_Points = 10;
//
CAL_UcesatMin = 400;					// in mV
CAL_UcesatMax = 5200;					// in mV
//
CAL_IceMin = [50, 301]				// in A
CAL_IceMax = [300, 1700]			// in A



//
CAL_UgeMin = 10;					// in V
CAL_UgeMax = 20;					// in V
//
CAL_Iterations = 3;
CAL_UseAvg = 0;

// Counters
CAL_CntTotal = 0;
CAL_CntDone = 0;

// Channels
CAL_chMeasureI = 1;
CAL_chMeasureU = 2;
CAL_chSync = 3;

// Results storage
CAL_Ucesat = [];
CAL_Ice = [];
CAL_Iset = [];
CAL_Uge = [];
CAL_UgeSet = [];

// Tektronix data
CAL_UcesatSc = [];
CAL_IceSc = [];
CAL_IsetSc = [];
CAL_UgeSc = [];

// Relative error
CAL_UcesatErr = [];
CAL_IceErr = [];
CAL_IsetErr = [];
CAL_UgeErr = [];
CAL_UgeSetErr = [];

// Correction
CAL_UcesatCorr = [];
CAL_IceCorr = [];
CAL_IsetCorr = [];
CAL_UgeCorr = [];
CAL_UgeSetCorr = [];

function SVTU_Init_Mes_Device(portDevice, portTek, channelMeasureI, channelMeasureU, channelSync)
{
	if (CAL_measuring_device == "TPS2000")
	{
		// Init device port
		dev.Disconnect();
		dev.co(portDevice);

		if (channelMeasureI < 1 || channelMeasureI > 4)
		{
			print("Wrong channel numbers");
			return;
		}

		// Copy channel information
		CAL_chMeasureU = channelMeasureU;
		CAL_chMeasureI = channelMeasureI;
		CAL_chSync = channelSync;

		// Init Tektronix port
		TEK_PortInit(portTek);
	
		// Tektronix init
		for (var i = 1; i <= 4; i++)
		{
			if ((i == CAL_chMeasureU) || (i == channelMeasureI) || (i == CAL_chSync))
				TEK_ChannelOn(i);
			else
				TEK_ChannelOff(i);
		}
	
		TEK_ChannelInit(CAL_chSync, "1", "1");
		SVTU_TriggerInit(CAL_chSync);
	}
	else if (CAL_measuring_device == "DMM6000")
	{
		// Init device port
		dev.Disconnect();
		dev.co(portDevice);

		// DMM6500 init
		KEI_Reset();
	}
}

function SVTU_CalibrateUcesat()
{
	SVTU_ResetA();
	SVTU_ResetUcesatCal();
	
	
	// Tektronix init
	if(CAL_measuring_device == "TPS2000")
		SVTU_TekInit(CAL_chMeasureU);
	else if (CAL_measuring_device == "DMM6000")
	{
		KEI_ConfigVoltage(CAL_V_PulsePlate);
		KEI_ConfigExtTrigger(CAL_V_TriggerDelay);
	}

	// Reload values
	var CAL_UcesatStp = Math.round((CAL_UcesatMax - CAL_UcesatMin) / (CAL_Points - 1));
	var VoltageArray = CGEN_GetRange(CAL_UcesatMin, CAL_UcesatMax, CAL_UcesatStp);
	
	if (SVTU_CollectUcesat(VoltageArray, CAL_Iterations))
	{
		SVTU_SaveUcesat("SVTU_Ucesat");

		// Plot relative error distribution
		scattern(CAL_UcesatSc, CAL_UcesatErr, "Voltage (in mV)", "Error (in %)", "Ucesat relative error " + CAL_UcesatMin + " ... " + CAL_UcesatMax + " mV");

		// Calculate correction
		CAL_UcesatCorr = CGEN_GetCorrection2("SVTU_Ucesat");
		SVTU_CalUcesat(SVTU_UcesatCorr[0], SVTU_UcesatCorr[1], SVTU_UcesatCorr[2]);
		SVTU_PrintCoefUcesat();
	}
}

function SVTU_VerifyUcesat()
{
	SVTU_ResetA();

	// Tektronix init
	if(CAL_measuring_device == "TPS2000")
		SVTU_TekInit(CAL_chMeasureU);
	else if (CAL_measuring_device == "DMM6000")
	{
		KEI_ConfigVoltage(CAL_V_PulsePlate);
		KEI_ConfigExtTrigger(CAL_V_TriggerDelay);
	}

	// Reload values
	var CAL_UcesatStp = Math.round((CAL_UcesatMax - CAL_UcesatMin) / (CAL_Points - 1));
	var VoltageArray = CGEN_GetRange(CAL_UcesatMin, CAL_UcesatMax, CAL_UcesatStp);

	if (SVTU_CollectUcesat(VoltageArray, CAL_Iterations))
	{
		SVTU_SaveUcesat("SVTU_Ucesat_fixed");

		// Plot relative error distribution
		scattern(CAL_UcesatSc, CAL_UcesatErr, "Voltage (in mV)", "Error (in %)", "Ucesat relative error " + CAL_UcesatMin + " ... " + CAL_UcesatMax + " mV");
	}
}

function SVTU_CalibrateIce()
{		
	SVTU_ResetA();
	SVTU_ResetIceCal();

	// Tektronix init
	if(CAL_measuring_device == "TPS2000")
		SVTU_TekInit(CAL_chMeasureI);
	else if (CAL_measuring_device == "DMM6000")
	{
		KEI_ConfigVoltage(CAL_V_PulsePlate);
		KEI_ConfigExtTrigger(CAL_V_TriggerDelay);
	}

	// Reload values
	var CAL_IceStp = Math.round((CAL_IceMax[CAL_CurrentRange] - CAL_IceMin[CAL_CurrentRange]) / (CAL_Points - 1));
	var CurrentArray = CGEN_GetRange(CAL_IceMin[CAL_CurrentRange], CAL_IceMax[CAL_CurrentRange], CAL_IceStp);

	if (SVTU_CollectIce(CurrentArray, CAL_Iterations))
	{
		SVTU_SaveIce("SVTU_Ice");

		// Plot relative error distribution
		scattern(CAL_IceSc, CAL_IceErr, "Current (in A)", "Error (in %)", "Ice relative error " + CAL_IceMin + " ... " + CAL_IceMax + " A");

		// Calculate correction
		CAL_IceCorr = CGEN_GetCorrection2("SVTU_Ice");
		SVTU_CalIce(SVTU_IceCorr[0], SVTU_IceCorr[1], SVTU_IceCorr[2]);

		SVTU_PrintCoefIce();
	}
}

function SVTU_VerifyIce()
{		
	SVTU_ResetA();
	
	// Tektronix init
	if(CAL_measuring_device == "TPS2000")
		SVTU_TekInit(CAL_chMeasureI);
	else if (CAL_measuring_device == "DMM6000")
	{
		KEI_ConfigVoltage(CAL_V_PulsePlate);
		KEI_ConfigExtTrigger(CAL_V_TriggerDelay);
	}

	// Reload values
	var CAL_IceStp = Math.round((CAL_IceMax[CAL_CurrentRange] - CAL_IceMin[CAL_CurrentRange]) / (CAL_Points - 1));
	var CurrentArray = CGEN_GetRange(CAL_IceMin[CAL_CurrentRange], CAL_IceMax[CAL_CurrentRange], CAL_IceStp);

	if (SVTU_CollectIce(CurrentArray, CAL_Iterations))
	{
		SVTU_SaveIce("SVTU_Ice_fixed");

		// Plot relative error distribution
		scattern(CAL_IceSc, CAL_IceErr, "Current (in A)", "Error (in %)", "Ice relative error " + CAL_IceMin + " ... " + CAL_IceMax + " A");
	}
}

function SVTU_CalibrateIset()
{		
	SVTU_ResetA();
	SVTU_ResetIsetCal();
	
	// Tektronix init
	if(CAL_measuring_device == "TPS2000")
		SVTU_TekInit(CAL_chMeasureI);
	else if (CAL_measuring_device == "DMM6000")
	{
		KEI_ConfigVoltage(CAL_V_PulsePlate);
		KEI_ConfigExtTrigger(CAL_V_TriggerDelay);
	}

	var CAL_IceStp = Math.round((CAL_IceMax[CAL_CurrentRange] - CAL_IceMin[CAL_CurrentRange]) / (CAL_Points - 1));
	var CurrentArray = CGEN_GetRange(CAL_IceMin[CAL_CurrentRange], CAL_IceMax[CAL_CurrentRange], CAL_IceStp);

	if (SVTU_CollectIset(CurrentArray, CAL_Iterations))
	{
		SVTU_SaveIset("SVTU_Iset");

		// Plot relative error distribution
		scattern(CAL_IsetSc, CAL_IsetErr, "Current (in A)", "Error (in %)", "Ice set relative error " + CAL_IceMin + " ... " + CAL_IceMax + " A");

		// Calculate correction
		CAL_IsetCorr = CGEN_GetCorrection2("SVTU_Iset");
		SVTU_CalIset(SVTU_IsetCorr[0], SVTU_IsetCorr[1], SVTU_IsetCorr[2]);
		SVTU_PrintCoefIset();
	}
}

function SVTU_VerifyIset()
{		
	SVTU_ResetA();
	
	
	// Tektronix init
	if(CAL_measuring_device == "TPS2000")
		SVTU_TekInit(CAL_chMeasureI);
	else if (CAL_measuring_device == "DMM6000")
	{
		KEI_ConfigVoltage(CAL_V_PulsePlate);
		KEI_ConfigExtTrigger(CAL_V_TriggerDelay);
	}

	var CAL_IceStp = Math.round((CAL_IceMax[CAL_CurrentRange] - CAL_IceMin[CAL_CurrentRange]) / (CAL_Points - 1));
	var CurrentArray = CGEN_GetRange(CAL_IceMin[CAL_CurrentRange], CAL_IceMax[CAL_CurrentRange], CAL_IceStp);

	if (SVTU_CollectIset(CurrentArray, CAL_Iterations))
	{
		SVTU_SaveIset("SVTU_Iset_fixed");

		// Plot relative error distribution
		scattern(CAL_IsetSc, CAL_IsetErr, "Current (in A)", "Error (in %)", "Ice set relative error " + CAL_IceMin + " ... " + CAL_IceMax + " A");
	}
}

function SVTU_CalibrateUge()
{
	SVTU_ResetA();
	SVTU_ResetUgeCal();
	
	// Tektronix init
	if(CAL_measuring_device == "TPS2000")
		SVTU_GateTekInit(CAL_chMeasureU);
	else if (CAL_measuring_device == "DMM6000")
	{
		KEI_ConfigVoltage(CAL_V_PulsePlate);
		KEI_ConfigExtTrigger(CAL_V_TriggerDelay);
	}
	
	// Reload values
	var CAL_UgeStp = Math.round((CAL_UgeMax - CAL_UgeMin) / (CAL_Points - 1));
	var VoltageArray = CGEN_GetRange(CAL_UgeMin, CAL_UgeMax, CAL_UgeStp);
	
	if (SVTU_CollectUge(VoltageArray, CAL_Iterations))
	{
		SVTU_SaveUge("SVTU_Uge", "SVTU_UgeSet");

		// Plot relative error distribution
		scattern(CAL_UgeSc, CAL_UgeErr, "Voltage (in mV)", "Error (in %)", "Uge relative error " + CAL_UgeMin + " ... " + CAL_UgeMax + " mV");
		scattern(CAL_UgeSc, CAL_UgeSetErr, "Voltage (in mV)", "Error (in %)", "Uge set relative error " + CAL_UgeMin + " ... " + CAL_UgeMax + " mV");

		// Calculate correction
		CAL_UgeCorr = CGEN_GetCorrection2("SVTU_Uge");
		SVTU_CalUge(SVTU_UgeCorr[0], SVTU_UgeCorr[1], SVTU_UgeCorr[2]);
		
		// Print correction Uge
		SVTU_PrintCoefUge();
		
		// Calculate correction
		CAL_UgeSetCorr = CGEN_GetCorrection2("SVTU_UgeSet");
		SVTU_CalUgeSet(SVTU_UgeSetCorr[0], SVTU_UgeSetCorr[1], SVTU_UgeSetCorr[2]);

		// Print correction UgeSet
		SVTU_PrintCoefUgeSet();
	}
}

function SVTU_VerifyUge()
{
	SVTU_ResetA();
	// Tektronix init
	if(CAL_measuring_device == "TPS2000")
		SVTU_GateTekInit(CAL_chMeasureU);
	else if (CAL_measuring_device == "DMM6000")
	{
		KEI_ConfigVoltage(CAL_V_PulsePlate);
		KEI_ConfigExtTrigger(CAL_V_TriggerDelay);
	}

	// Reload values
	var CAL_UgeStp = Math.round((CAL_UgeMax - CAL_UgeMin) / (CAL_Points - 1));
	var VoltageArray = CGEN_GetRange(CAL_UgeMin, CAL_UgeMax, CAL_UgeStp);

	if (SVTU_CollectUge(VoltageArray, CAL_Iterations))
	{
		SVTU_SaveUge("SVTU_Uge_fixed", "SVTU_UgeSet_fixed");

		// Plot relative error distribution
		scattern(CAL_UgeSc, CAL_UgeErr, "Voltage (in mV)", "Error (in %)", "Uge relative error " + CAL_UgeMin + " ... " + CAL_UgeMax + " mV");
		scattern(CAL_UgeSc, CAL_UgeSetErr, "Voltage (in mV)", "Error (in %)", "Uge set relative error " + CAL_UgeMin + " ... " + CAL_UgeMax + " mV");
	}
}

function SVTU_CollectUcesat(VoltageValues, IterationsCount)
{
	CAL_CntTotal = IterationsCount * VoltageValues.length;
	CAL_CntDone = 1;

	var AvgNum;
	if(CAL_measuring_device == "TPS2000")
	{
		if (CAL_UseAvg)
		{
			AvgNum = 4;
			TEK_AcquireAvg(AvgNum);
		}
		else
		{
			AvgNum = 1;
			TEK_AcquireSample();
		}
	}
	else if (CAL_measuring_device == "DMM6000")
		AvgNum = 1;

	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < VoltageValues.length; j++)
		{
			print("-- result " + CAL_CntDone++ + " of " + CAL_CntTotal + " --");
			
			if(CAL_measuring_device == "TPS2000")
				SVTU_TekScale(CAL_chMeasureU, VoltageValues[j] / 1000);
			else if (CAL_measuring_device == "DMM6000")
			{
				KEI_SetVoltageRange(VoltageValues[j] / 1000);
				KEI_ActivateTrigger();
			}

			var PrintTemp = SVTU_Print;
			SVTU_Print = 0;
			
			for (var k = 0; k < AvgNum; k++)
			{
				if (!SVTU_StartMeasure(VoltageValues[j] / CAL_Rload * 1000))
					return 0;
			}
			
			SVTU_Print = PrintTemp;
			
			// Unit data
			var UcesatRead = dev.r(200);
			SVTU_Ucesat.push(UcesatRead);
			print("Ucesatread, mV: " + UcesatRead);

			// Scope data
			if(CAL_measuring_device == "TPS2000")
				var UcesatSc = (SVTU_Measure(CAL_chMeasureU) * 1000).toFixed(2);
			else if (CAL_measuring_device == "DMM6000")
				var UcesatSc = (KEI_ReadAverage() * 1000).toFixed(3);

			SVTU_UcesatSc.push(UcesatSc);

			if(CAL_measuring_device == "TPS2000")
				print("Ucesattek,  mV: " + UcesatSc);
			else if (CAL_measuring_device == "DMM6000")
				print("UcesatDMM,  mV: " + UcesatSc);

			// Relative error
			var UcesatErr = ((UcesatRead - UcesatSc) / UcesatSc * 100).toFixed(2);
			SVTU_UcesatErr.push(UcesatErr);
			print("Ucesaterr,  %: " + UcesatErr);
			print("--------------------");
			
			if (anykey()) return 0;

			sleep(500);
		}
	}

	return 1;
}

function SVTU_CollectIce(CurrentValues, IterationsCount)
{
	CAL_CntTotal = IterationsCount * CurrentValues.length;
	CAL_CntDone = 1;

	var AvgNum;
	if(CAL_measuring_device == "TPS2000")
	{
		if (CAL_UseAvg)
		{
			AvgNum = 4;
			TEK_AcquireAvg(AvgNum);
		}
		else
		{
			AvgNum = 1;
			TEK_AcquireSample();
		}
	}
	else if (CAL_measuring_device == "DMM6000")
		AvgNum = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{					
			print("-- result " + CAL_CntDone++ + " of " + CAL_CntTotal + " --");
			//
			if(CAL_measuring_device == "TPS2000")
				SVTU_TekScale(CAL_chMeasureI, CurrentValues[j] * CAL_Rshunt / 1000000);
			else if (CAL_measuring_device == "DMM6000")
			{
				KEI_SetVoltageRange((CurrentValues[j]) * CAL_Rshunt / 1000000);
				KEI_ActivateTrigger();
			}

			var PrintTemp = SVTU_Print;
			SVTU_Print = 0;
			
			for (var k = 0; k < AvgNum; k++)
			{
				if (!SVTU_StartMeasure(CurrentValues[j]))
					return 0;
			}
			
			SVTU_Print = PrintTemp;
			
			// Unit data
			var IceRead = dev.rf(201);
			SVTU_Ice.push(IceRead);
			print("Iceread, A: " + IceRead);

			// Scope data
			if(CAL_measuring_device == "TPS2000")
				var IceSc = (SVTU_Measure(CAL_chMeasureI) / CAL_Rshunt * 1000000).toFixed(2);
			else if (CAL_measuring_device == "DMM6000")
				var IceSc = (KEI_ReadAverage() / CAL_Rshunt * 1000000).toFixed(4);

			SVTU_IceSc.push(IceSc);

			if(CAL_measuring_device == "TPS2000")
				print("Icetek, A: " + IceSc);
			else if (CAL_measuring_device == "DMM6000")
				print("IceDMM, A: " + IceSc);

			// Relative error
			var IceErr = ((IceSc - IceRead) / IceRead * 100).toFixed(2);
			SVTU_IceErr.push(IceErr);
			print("Iceerr, %: " + IceErr);
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function SVTU_CollectIset(CurrentValues, IterationsCount)
{
	CAL_CntTotal = IterationsCount * CurrentValues.length;
	CAL_CntDone = 1;

	var AvgNum;
	if(CAL_measuring_device == "TPS2000")
	{
		if (CAL_UseAvg)
		{
			AvgNum = 4;
			TEK_AcquireAvg(AvgNum);
		}
		else
		{
			AvgNum = 1;
			TEK_AcquireSample();
		}
	}
	else if (CAL_measuring_device == "DMM6000")
		AvgNum = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			print("-- result " + CAL_CntDone++ + " of " + CAL_CntTotal + " --");
			//
			if(CAL_measuring_device == "TPS2000")
				SVTU_TekScale(CAL_chMeasureI, CurrentValues[j] * CAL_Rshunt / 1000000);
			else if (CAL_measuring_device == "DMM6000")
			{
				KEI_SetVoltageRange(CurrentValues[j] * CAL_Rshunt / 1000000);
				KEI_ActivateTrigger();
			}
			
			var PrintTemp = SVTU_Print;
			SVTU_Print = 0;
			
			for (var k = 0; k < AvgNum; k++)
			{
				if (!SVTU_StartMeasure(CurrentValues[j]))
					return 0;
			}
			
			SVTU_Print = PrintTemp;
			
			// Unit data
			var Iset = CurrentValues[j];
			SVTU_Iset.push(Iset);
			print("Iset, A: " + Iset);

			// Scope data
			if(CAL_measuring_device == "TPS2000")
				var IsetSc = (SVTU_Measure(CAL_chMeasureI) / CAL_Rshunt * 1000000).toFixed(2);
			else if (CAL_measuring_device == "DMM6000")
				var IsetSc = (KEI_ReadAverage() / CAL_Rshunt * 1000000).toFixed(4);

			SVTU_IsetSc.push(IsetSc);

			if(CAL_measuring_device == "TPS2000")
				print("IceSettek, A: " + IsetSc);
			else if (CAL_measuring_device == "DMM6000")
				print("IceSetDMM, A: " + IsetSc);

			// Relative error
			var IsetErr = ((IsetSc - Iset) / Iset * 100).toFixed(2);
			SVTU_IsetErr.push(IsetErr);
			print("Iseterr, %: " + IsetErr);
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function SVTU_CollectUge(VoltageValues, IterationsCount)
{
	CAL_CntTotal = IterationsCount * VoltageValues.length;
	CAL_CntDone = 1;

	var AvgNum;
	if(CAL_measuring_device == "TPS2000")
	{
		if (CAL_UseAvg)
		{
			AvgNum = 4;
			TEK_AcquireAvg(AvgNum);
		}
		else
		{
			AvgNum = 1;
			TEK_AcquireSample();
		}
	}
	else if (CAL_measuring_device == "DMM6000")
		AvgNum = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < VoltageValues.length; j++)
		{
			print("-- result " + CAL_CntDone++ + " of " + CAL_CntTotal + " --");
			//
			if(CAL_measuring_device == "TPS2000")
				SVTU_TekScale(CAL_chMeasureU, VoltageValues[j] / 1000);
			else if (CAL_measuring_device == "DMM6000")
			{
				KEI_SetVoltageRange(VoltageValues[j]+3);
				KEI_ActivateTrigger();
			}

			GateVoltage = VoltageValues[j];
			dev.wf(129, GateVoltage);

			if(CAL_measuring_device == "TPS2000")
			{
				TEK_Send("trigger:main:edge:slope rise");
				TEK_Send("horizontal:position " + 0.0002);
			}

			var PrintTemp = SVTU_Print;
			SVTU_Print = 0;

			for (var k = 0; k < AvgNum; k++)
			{
				if (!SVTU_StartMeasure(100))
				sleep(500);
			}

			SVTU_Print = PrintTemp;

			// Unit data
			var UgeSet = VoltageValues[j];
			SVTU_UgeSet.push(UgeSet);
			print("UgeSet, mV: " + UgeSet);
			//
			var Uge = dev.rf(202);
			SVTU_Uge.push(Uge);
			print("Uge, mV: " + Uge);

			// Scope data
			if(CAL_measuring_device == "TPS2000")
				var UgeSc = (SVTU_Measure(CAL_chMeasureU) * 1000).toFixed(2);
			else if (CAL_measuring_device == "DMM6000")
				var UgeSc = (KEI_ReadAverage() * 1).toFixed(4);

			SVTU_UgeSc.push(UgeSc);

			if(CAL_measuring_device == "TPS2000")
				print("UgeTek,  mV: " + UgeSc);
			else if (CAL_measuring_device == "DMM6000")
				print("UgeDMM,  mV: " + UgeSc);

			// Relative error
			var UgeSetErr = ((UgeSc - UgeSet) / UgeSet * 100).toFixed(2);
			SVTU_UgeSetErr.push(UgeSetErr);
			print("UgeSetErr,  %: " + UgeSetErr);
			//
			var UgeErr = ((UgeSc - Uge) / Uge * 100).toFixed(2);
			SVTU_UgeErr.push(UgeErr);
			print("UgeErr,  %: " + UgeErr);
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function SVTU_TriggerInit(Channel)
{
	TEK_TriggerInit(CAL_chSync, 2.5);
	TEK_Send("trigger:main:edge:slope fall");
	sleep(1000);
}

function SVTU_TekScale(Channel, Value)
{
	// 0.9 - use 90% of full range
	// 8 - number of scope grids in full scale
	var scale = (Value / (8 * 0.9));
	TEK_Send("ch" + Channel + ":scale " + scale);
}

function SVTU_TekInit(Channel)
{
	TEK_Horizontal("1e-3", "0");
	TEK_ChannelInit(Channel, "1", "2");
	SVTU_TekMeasurement(Channel);
}

function SVTU_GateTekInit(Channel)
{
	TEK_Horizontal("25e-6", "5e-6");
	TEK_ChannelInit(Channel, "1", "2");
	SVTU_TekMeasurement(Channel);
}

function SVTU_TekCursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send("cursor:vbars:position1 0");
	TEK_Send("cursor:vbars:position2 0");
}

function SVTU_Measure(Channel)
{
	sleep(1000);
	return TEK_Measure(Channel);
}

function SVTU_TekMeasurement(Channel)
{
	TEK_Send("measurement:meas" + Channel + ":source ch" + Channel);
	TEK_Send("measurement:meas" + Channel + ":type maximum");
}

// Reset Arrays
function SVTU_ResetA()
{	
	// Results storage
	CAL_Ucesat = [];
	CAL_Ice = [];
	CAL_Iset = [];
	CAL_Ig = [];
	CAL_IgSet = [];
	CAL_Uge = [];
	CAL_UgeSet = [];

	// Tektronix data
	CAL_UcesatSc = [];
	CAL_IceSc = [];
	CAL_IsetSc = [];
	CAL_IgSc = [];
	CAL_UgeSc = [];

	// Relative error
	CAL_UcesatErr = [];
	CAL_IceErr = [];
	CAL_IsetErr = [];
	CAL_IgErr = [];
	CAL_IgSetErr = [];
	CAL_UgeErr = [];
	CAL_UgeSetErr = [];

	// Correction
	CAL_UcesatCorr = [];
	CAL_IceCorr = [];
	CAL_IsetCorr = [];
	CAL_IgCorr = [];
	CAL_IgSetCorr = [];
	CAL_UgeCorr = [];
	CAL_UgeSetCorr = [];
}

// Save
function SVTU_SaveUcesat(NameUcesat)
{
	CGEN_SaveArrays(NameUcesat, CAL_Ucesat, CAL_UcesatSc, CAL_UcesatErr);
}

function SVTU_SaveIce(NameIce)
{
	CGEN_SaveArrays(NameIce, CAL_Ice, CAL_IceSc, CAL_IceErr);
}

function SVTU_SaveIset(NameIset)
{
	CGEN_SaveArrays(NameIset, CAL_IsetSc, CAL_Iset, CAL_IsetErr);
}

function SVTU_SaveUge(NameUge, NameUgeSet)
{
	CGEN_SaveArrays(NameUge, CAL_Uge, CAL_UgeSc, CAL_UgeErr);
	CGEN_SaveArrays(NameUgeSet, CAL_UgeSc, CAL_UgeSet, CAL_UgeErr);
}

// Cal
function SVTU_CalUcesat(P2, P1, P0)
{
	dev.wf(10, P2);
	dev.wf(11, P1);
	dev.wf(12, P0);
}

function SVTU_CalIce(P2, P1, P0)
{
	switch (CAL_CurrentRange)
	{
		case 0:
			dev.wf(0, P2);
			dev.wf(1, P1);
			dev.wf(2, P0);
			break;
		case 1:
			dev.wf(5, P2);
			dev.wf(6, P1);
			dev.wf(7, P0);
			break;
		default:
			print("Incorrect I range.");
			break;
	}
}

function SVTU_CalIset(P2, P1, P0)
{

	switch (CAL_CurrentRange)
	{
		case 0:
			dev.wf(30, P2);
			dev.wf(31, P1);
			dev.wf(32, P0);
			break;
		case 1:
			dev.wf(50, P2);
			dev.wf(51, P1);
			dev.wf(52, P0);
			break;
		default:
			print("Incorrect I range.");
			break;
	}

}

function SVTU_CalUge(P2, P1, P0)
{
	dev.wf(15, P2);
	dev.wf(16, P1);
	dev.wf(17, P0);
}

function SVTU_CalUgeSet(P2, P1, P0)
{
	dev.wf(20, P2);
	dev.wf(21, P1);
	dev.wf(22, P0);
}

// Print
function SVTU_PrintCoefUcesat()
{
	print("Ucesat P2 : " + dev.rf(10));
	print("Ucesat P1 : " + dev.rf(11));
	print("Ucesat P0 : " + dev.rf(12));
}

function SVTU_PrintCoefIce()
{
	switch (CAL_CurrentRange)
	{
		case 0:
			print("Ice 0 P2 : " + dev.rf(0));
			print("Ice 0 P1	: " + dev.rf(1));
			print("Ice 0 P0	: " + dev.rf(2));
			break;
		case 1:
			print("Ice 1 P2 : " + dev.rf(5));
			print("Ice 1 P1 : " + dev.rf(6));
			print("Ice 1 P0 : " + dev.rf(7));
			break;
		default:
			print("Incorrect I range.");
			break;
	}
}

function SVTU_PrintCoefIset()
{
	switch (CAL_CurrentRange)
	{
		case 0:
			print("IceSet P2 : " + dev.rf(30));
			print("IceSet P1 : " + dev.rf(31));
			print("IceSet P0 : " + dev.rf(32));
			break;
		case 1:
			print("Ice 1 P2 : " + dev.rf(50));
			print("Ice 1 P1 : " + dev.rf(51));
			print("Ice 1 P0 : " + dev.rf(52));
			break;
		default:
			print("Incorrect I range.");
			break;
	}
}

function SVTU_PrintCoefUge()
{
	print("Uge P2 : " + dev.rf(15));
	print("Uge P1 : " + dev.rf(16));
	print("Uge P0 : " + dev.rf(17));
}

function SVTU_PrintCoefUgeSet()
{
	print("Uge Set P2 : " + dev.rf(20));
	print("Uge Set P1 : " + dev.rf(21));
	print("Uge Set P0 : " + dev.rf(22));
}

// Reset
function SVTU_ResetUcesatCal()
{
	SVTU_CalUcesat(0, 1, 0);
}

function SVTU_ResetIceCal()
{
	SVTU_CalIce(0, 1, 0);
}

function SVTU_ResetIsetCal()
{
	SVTU_CalIset(0, 1, 0);
}

function SVTU_ResetUgeCal()
{
	SVTU_CalUge(0, 1, 0);
	SVTU_CalUgeSet(0, 1, 0);
}