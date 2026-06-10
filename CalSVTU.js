include("TestSVTU.js")
include("Tektronix.js")
include("CalGeneral.js")
include("DMM6500.js")
include("E3632A.js")
// include("Numeric.js")

// Calibration setup parameters
CAL_Rshunt = 0.000075;				// in Ohms
CAL_Rload = 0.003527;		     	// in Ohms
CAL_GateRshunt = 10000;				// in mOhms

CAL_ErrShunt = 0.5; // погрешность шунта в %
CAL_ErrDMM6500 = 0.0065; // наихудшая погрешность мультиметра в %
CAL_NoiseDMM6500 = 0.083; // наихудшая погрешность, вносимая шумами мультиметра, в %
CAL_ErrTek = 3;
CAL_ErrE3632A = 0.01 // 0,01 для калибровки по заданию, 0,005 - по измерению

// Setup parameters for "DMM6000"
CAL_V_PulsePlate 	= 1000 			// in us
CAL_V_TriggerDelay	= 0				// in s
CAL_measuring_device = "DMM6000";	// "DMM6000", "TPS2000" or "E3632A"
CAL_E3632A_manual_input = 1; 				// 1 - ручной ввод значений с E3632A, 0 - используется заданное значение напряжения
CAL_NPLC = 0.0005;

// Current range number
CAL_CurrentRange = 0;				// MME 301 (0 = [ < 300 A]; 1 = [ < 1700 A]), MME 303 (0 = [75-1000 A]; 1 = [1001-7500 A])
CAL_VoltageRange = 0;				// MME 303 (0 = [600 - 5500 mV]; 1 = [5500 - 15000 mV])
//
CAL_Points = 10;
//
CAL_UcesatMin = [600, 5500];		// in mV
CAL_UcesatMax = [5500, 15000];		// in mV
//
CAL_IceMin = [50, 301]				// in A
CAL_IceMax = [300, 1700]			// in A

//
CAL_UgeMin = 10;					// in V
CAL_UgeMax = 20;					// in V
//
CAL_Iterations = 1;
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

// Summary error
CAL_UcesatErrSum = [];
CAL_IsetErrSum = [];
CAL_UgeSetErrSum = [];

function CAL_Init_Mes_Device(portDevice, portTek, channelMeasureI, channelMeasureU, channelSync)
{
	switch (CAL_measuring_device)
	{
		case "TPS2000":
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
			TEK_Send("RECAll:SETUp FACtory");
		
			// Tektronix init
			for (var i = 1; i <= 4; i++)
			{
				if ((i == CAL_chMeasureU) || (i == channelMeasureI) || (i == CAL_chSync))
					TEK_ChannelOn(i);
				else
					TEK_ChannelOff(i);
			}
		
			TEK_ChannelInit(CAL_chSync, "1", "1");
			CAL_TriggerInit(CAL_chSync);
			break;

		case "DMM6000":
			// Init device port
			dev.Disconnect();
			dev.co(portDevice);

			// DMM6500 init
			KEI_Reset();
			break;

		case "E3632A":
			// Init device port
			dev.Disconnect();
			dev.co(portDevice);

			//E3632A init
			E3632A_PortInit(portTek);
			break;
	}
}

function CAL_CalibrateUcesat()
{
	CAL_ResetA();
	CAL_ResetUcesatCal();

	if(CAL_measuring_device == "TPS2000")
		CAL_TekInit(CAL_chMeasureU);
	else if (CAL_measuring_device == "DMM6000")
		CAL_KEI_Init();
	
	if (CAL_CollectUcesat())
	{
		CAL_SaveUcesat("SVTU_Ucesat");

		CAL_PlotUcesat();

		// Calculate correction
		CAL_UcesatCorr = CGEN_GetCorrection2("SVTU_Ucesat");
		CAL_CalUcesat(CAL_UcesatCorr[0], CAL_UcesatCorr[1], CAL_UcesatCorr[2]);
		CAL_PrintCoefUcesat();
	}
}

function CAL_VerifyUcesat()
{
	CAL_ResetA();

	if(CAL_measuring_device == "TPS2000")
		CAL_TekInit(CAL_chMeasureU);
	else if (CAL_measuring_device == "DMM6000")
		CAL_KEI_Init();

	if (CAL_CollectUcesat())
	{
		CAL_SaveUcesat("SVTU_Ucesat_fixed");

		CAL_PlotUcesat();
	}
}

function CAL_CalibrateIset()
{		
	CAL_ResetA();
	CAL_ResetIsetCal();
	
	if(CAL_measuring_device == "TPS2000")
		CAL_TekInit(CAL_chMeasureI);
	else if (CAL_measuring_device == "DMM6000")
		CAL_KEI_Init();

	if (CAL_CollectIce())
	{
		CAL_SaveIset("SVTU_Iset");

		CAL_PlotIce(1, 0);
		
		// Calculate correction
		CAL_IsetCorr = CGEN_GetCorrection2("SVTU_Iset");
		CAL_CalIset(CAL_IsetCorr[0], CAL_IsetCorr[1], CAL_IsetCorr[2]);
		CAL_PrintCoefIset();
	}
}

function CAL_CalibrateIce()
{		
	CAL_ResetA();
	CAL_ResetIceCal();
	
	if(CAL_measuring_device == "TPS2000")
		CAL_TekInit(CAL_chMeasureI);
	else if (CAL_measuring_device == "DMM6000")
		CAL_KEI_Init();

	if (CAL_CollectIce())
	{
		CAL_SaveIce("SVTU_Ice");

		// Plot relative error distribution
		CAL_PlotIce(0, 1);

		// Calculate correction
		CAL_IceCorr = CGEN_GetCorrection2("SVTU_Ice");
		CAL_CalIce(CAL_IceCorr[0], CAL_IceCorr[1], CAL_IceCorr[2]);
		CAL_PrintCoefIce();
	}
}

function CAL_VerifyIce()
{		
	CAL_ResetA();
	
	if(CAL_measuring_device == "TPS2000")
		CAL_TekInit(CAL_chMeasureI);
	else if (CAL_measuring_device == "DMM6000")
		CAL_KEI_Init();

	if (CAL_CollectIce())
	{
		CAL_SaveIset("SVTU_Iset_fixed");
		CAL_SaveIce("SVTU_Ice_fixed");

		CAL_PlotIce(1, 1);
	}
}

function CAL_CalibrateUge()
{
	CAL_ResetA();
	CAL_ResetUgeCal();
	
	if(CAL_measuring_device == "TPS2000")
		CAL_GateTekInit(CAL_chMeasureU);
	else if (CAL_measuring_device == "DMM6000")
		CAL_KEI_Init();

	if (CAL_CollectUge())
	{
		CAL_SaveUge("SVTU_Uge");

		CAL_PlotUge();

		// Calculate correction
		CAL_UgeCorr = CGEN_GetCorrection2("SVTU_Uge");
		CAL_CalUge(CAL_UgeCorr[0], CAL_UgeCorr[1], CAL_UgeCorr[2]);
		
		// Print correction Uge
		CAL_PrintCoefUge();
	}
}

function CAL_CalibrateUgeSet()
{
	CAL_ResetA();
	CAL_ResetUgeSetCal();
	
	if(CAL_measuring_device == "TPS2000")
		CAL_GateTekInit(CAL_chMeasureU);
	else if (CAL_measuring_device == "DMM6000")
		CAL_KEI_Init();

	if (CAL_CollectUge())
	{
		CAL_SaveUgeSet("SVTU_UgeSet");

		CAL_PlotUge();
		
		// Calculate correction
		CAL_UgeSetCorr = CGEN_GetCorrection2("SVTU_UgeSet");
		CAL_CalUgeSet(CAL_UgeSetCorr[0], CAL_UgeSetCorr[1], CAL_UgeSetCorr[2]);

		// Print correction UgeSet
		CAL_PrintCoefUgeSet();
	}
}

function CAL_VerifyUge()
{
	CAL_ResetA();
	
	if(CAL_measuring_device == "TPS2000")
		CAL_GateTekInit(CAL_chMeasureU);
	else if (CAL_measuring_device == "DMM6000")
		CAL_KEI_Init();

	if (CAL_CollectUge())
	{
		CAL_SaveUge("SVTU_Uge_fixed");
		CAL_SaveUgeSet("SVTU_UgeSet_fixed");

		CAL_PlotUge();
	}
}

function CAL_CollectUcesat()
{
	var VoltageValues = CGEN_GetRangeLogarithm(CAL_UcesatMin[CAL_VoltageRange], CAL_UcesatMax[CAL_VoltageRange], CAL_Points);

	CAL_CntTotal = CAL_Iterations * VoltageValues.length;
	CAL_CntDone = 1;

	switch (CAL_measuring_device)
	{
		case "TPS2000":
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
			break;
		case "DMM6000":
			AvgNum = 1;
			break;
		case "E3632A":
			E3632A_OutputON();
			E3632A_ProtectionCurrent(1);
			AvgNum = 1;
			break;
	}

	for (var i = 0; i < CAL_Iterations; i++)
	{
		for (var j = 0; j < VoltageValues.length; j++)
		{
			print("-- result " + CAL_CntDone++ + " of " + CAL_CntTotal + " --");

			switch (CAL_measuring_device)
			{
				case "TPS2000":
					TEK_ScaleVertical(CAL_chMeasureU, VoltageValues[j] / 1000, 60);
					if(j == 0)
						TEK_TriggerInit(CAL_chSync, 2.5);
					TEK_Busy();
					break;
				case "DMM6000":
					KEI_ClearBuffer();
					KEI_SetVoltageDCRange(VoltageValues[j] / 1000 * 1.2);
					KEI_ActivateTrigger();
					break;
				case "E3632A":
					E3632A_SetVoltage(VoltageValues[j] / 1000);
					break;
			}

			sleep(2000);

			var PrintTemp = SVTU_Print;
			SVTU_Print = 0;
			
			for (var k = 0; k < AvgNum; k++)
			{
				switch (CAL_measuring_device)
				{
					case "TPS2000":
					case "DMM6000":
					if (!SVTU_StartMeasure(VoltageValues[j] / CAL_Rload / 1000, 20))
						return 0;
					break;
					case "E3632A":
					if (!SVTU_StartMeasure(100, 20))
						return 0;
					break;
				}
			}
			
			SVTU_Print = PrintTemp;
			
			sleep (2000);

			// Scope data
			switch (CAL_measuring_device)
			{
				case "TPS2000":
					var UcesatSc = (TEK_Measure(CAL_chMeasureU) * 1000).toFixed(2);
					print("UcesatTek,  mV: " + UcesatSc);
					break;
				case "DMM6000":
					var UcesatSc = (CALReadArrayTrapeze() * 1000).toFixed(2);
					print("UcesatDMM,  mV: " + UcesatSc);
					break;
				case "E3632A":
					if(CAL_E3632A_manual_input == 1)
					{
						CAL_ErrE3632A = 0.005;
						print("Введите напряжение с экрана E3632A в мВ:")
						var UcesatSc = parseFloat(readline());
					}
					else
					{
						CAL_ErrE3632A = 0.01;
						var UcesatSc = (VoltageValues[j]).toFixed(2);
					}
					print("UcesatE3632A,  mV: " + UcesatSc);
					break;
			}
			CAL_UcesatSc.push(UcesatSc);

			// Unit data
			var UcesatRead = dev.r(200);
			CAL_Ucesat.push(UcesatRead);
			print("UcesatMeas, mV: " + UcesatRead);

			// Relative error
			var UcesatErr = (UcesatRead - UcesatSc) / UcesatSc * 100;
			CAL_UcesatErr.push(UcesatErr);
			print("UcesatErr,  %: " + UcesatErr);

			// Summary error
			switch (CAL_measuring_device)
			{
				case "TPS2000":
					var UcesatErrSum = Math.sign_ma(UcesatErr) * (Math.abs(UcesatErr) + CAL_ErrTek);
					break;
				case "DMM6000":
					var E0 = CAL_DMM6500_Err(VoltageValues[j] / 1000);
					var UcesatErrSum = Math.sign_ma(UcesatErr) * (Math.abs(UcesatErr) + E0);
					break;
				case "E3632A":
					var E0 = (0.0005 * VoltageValues[j] / 1000 + CAL_ErrE3632A) / (VoltageValues[j] / 1000) * 100;
					var UcesatErrSum = Math.sign_ma(UcesatErr) * (Math.abs(UcesatErr) + E0);
					break;
			}
			CAL_UcesatErrSum.push(UcesatErrSum);
			print("UcesatErrSum, %: " + UcesatErrSum);

			print("--------------------");
			
			if (anykey())
			{
				if(CAL_measuring_device == "E3632A")
					E3632A_OutputOFF();
				return 0;
			} 
		}
	}

	if(CAL_measuring_device == "E3632A")
		E3632A_OutputOFF();
	return 1;
}

function CAL_CollectIce()
{
	var CurrentValues = CGEN_GetRangeLogarithm(CAL_IceMin[CAL_CurrentRange], CAL_IceMax[CAL_CurrentRange], CAL_Points);

	CAL_CntTotal = CAL_Iterations * CurrentValues.length;
	CAL_CntDone = 1;

	switch (CAL_measuring_device)
	{
		case "TPS2000":
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
			break;
		case "DMM6000":
			AvgNum = 1;
			break;
	}
	
	for (var i = 0; i < CAL_Iterations; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			print("-- result " + CAL_CntDone++ + " of " + CAL_CntTotal + " --");
			
			if(CAL_measuring_device == "TPS2000")
				TEK_ScaleVertical(CAL_chMeasureI, CurrentValues[j] * CAL_Rshunt, 60);
			else if (CAL_measuring_device == "DMM6000")
			{
				KEI_ClearBuffer();
				KEI_SetVoltageDCRange(CurrentValues[j] * CAL_Rshunt);
				KEI_ActivateTrigger();
			}

			sleep(2000);
			
			var PrintTemp = SVTU_Print;
			SVTU_Print = 0;
			
			for (var k = 0; k < AvgNum; k++)
			{
				if (!SVTU_StartMeasure(CurrentValues[j], 20))
					return 0;
			}
			
			SVTU_Print = PrintTemp;

			sleep (5000);

			// Set data
			var Iset = CurrentValues[j];
			CAL_Iset.push(Iset);
			print("Iset, A: " + Iset);

			// Unit data
			var IceMeas = dev.rf(201);
			CAL_Ice.push(IceMeas);
			print("IceMeas, A: " + IceMeas);

			// Scope data
			if(CAL_measuring_device == "TPS2000")
			{
				var IsetSc = (TEK_Measure(CAL_chMeasureI) / CAL_Rshunt).toFixed(2);
				print("IceTek, A: " + IsetSc);
			}
			else if (CAL_measuring_device == "DMM6000")
			{
				var IsetSc = (CALReadArrayTrapeze() / CAL_Rshunt).toFixed(2);
				print("IceDMM, A: " + IsetSc);
			}
			CAL_IceSc.push(IsetSc);

			// Set error
			var IsetErr = (IsetSc - Iset) / Iset * 100;
			CAL_IsetErr.push(IsetErr);
			print("IsetErr, %: " + IsetErr);

			// Relative error
			var IceErr = (IceMeas - IsetSc) / IsetSc * 100;
			CAL_IceErr.push(IceErr);
			print("IceЕrr, %: " + IceErr);

			// Summary error
			switch (CAL_measuring_device)
			{
				case "TPS2000":
					var IsetErrSum = Math.sign_ma(IsetErr) * (Math.abs(IsetErr) + CAL_ErrTek);
					break;
				case "DMM6000":
					var Err_DMM = CAL_DMM6500_Err(CurrentValues[j] * CAL_Rshunt);
					var E0 = 1.1 * Math.sqrt(Math.pow(CAL_ErrShunt, 2) + Math.pow(Err_DMM, 2));
					var IsetErrSum = Math.sign_ma(IsetErr) * (Math.abs(IsetErr) + E0);
					break;
			}
			CAL_IsetErrSum.push(IsetErrSum);
			print("IsetErrSum, %: " + IsetErrSum);

			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CAL_CollectUge()
{
	var VoltageValues = CGEN_GetRangeLogarithm(CAL_UgeMin, CAL_UgeMax, CAL_Points);

	CAL_CntTotal = CAL_Iterations * VoltageValues.length;
	CAL_CntDone = 1;

	switch (CAL_measuring_device)
	{
		case "TPS2000":
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
			break;
		case "DMM6000":
			AvgNum = 1;
			break;
	}
	
	for (var i = 0; i < CAL_Iterations; i++)
	{
		for (var j = 0; j < VoltageValues.length; j++)
		{
			print("-- result " + CAL_CntDone++ + " of " + CAL_CntTotal + " --");
			//
			if(CAL_measuring_device == "TPS2000")
				TEK_ScaleVertical(CAL_chMeasureU, VoltageValues[j], 90);

			else if (CAL_measuring_device == "DMM6000")
			{
				KEI_ClearBuffer();
				KEI_SetVoltageDCRange(VoltageValues[j]);
				KEI_ActivateTrigger();
			}

			if(CAL_measuring_device == "TPS2000" && j == 0)
			{
				TEK_TriggerInit(CAL_chSync, 2.5);
				TEK_Busy();
			}

			sleep (2000);

			var PrintTemp = SVTU_Print;
			SVTU_Print = 0;

			for (var k = 0; k < AvgNum; k++)
			{
				SVTU_StartMeasure(100, VoltageValues[j]);
				sleep(2000);
				if(anykey())
				break;
			}

			SVTU_Print = PrintTemp;

			sleep (2000);

			// Unit data
			var UgeSet = VoltageValues[j];
			CAL_UgeSet.push(UgeSet);
			print("UgeSet, V: " + UgeSet);
			//
			var Uge = dev.rf(202);
			CAL_Uge.push(Uge);
			print("Uge, V: " + Uge.toFixed(2));

			// Scope data
			if(CAL_measuring_device == "TPS2000")
				var UgeSc = TEK_Measure(2).toFixed(2);
			else if (CAL_measuring_device == "DMM6000")
			{
				var UgeScArr = KEI_ReadArray();
				var SumArr = 0;
				for (var c = 0; c < UgeScArr.length; c++) 
				{
					SumArr += UgeScArr[c];
				}
				var UgeSc = (SumArr / UgeScArr.length).toFixed(2);
			}
			CAL_UgeSc.push(UgeSc);

			if(CAL_measuring_device == "TPS2000")
				print("UgeTek,  V: " + UgeSc);
			else if (CAL_measuring_device == "DMM6000")
				print("UgeDMM,  mV: " + UgeSc);

			// Relative error
			var UgeSetErr = (UgeSc - UgeSet) / UgeSet * 100;
			CAL_UgeSetErr.push(UgeSetErr);
			print("UgeSetErr,  %: " + UgeSetErr);
			//
			var UgeErr = (Uge - UgeSc) / Uge * 100;
			CAL_UgeErr.push(UgeErr);
			print("UgeErr,  %: " + UgeErr);
			
			//Summary error
			if(CAL_measuring_device == "DMM6000")
			{
				var E0 = CAL_DMM6500_Err(VoltageValues[j]);
				var UgeSetErrSum = Math.sign_ma(UgeSetErr) * (Math.abs(UgeSetErr) + E0);
				CAL_UgeSetErrSum.push(UgeSetErrSum);
				print("UgeSetErrSum, %: " + UgeSetErrSum);
			}
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CALReadArrayTrapeze()
{
	var FloatArray = KEI_ReadArray();

	//var StartMassive = tmc.q(':TRACe:ACTual:STARt? "TestBuffer"');

	var TrapezeArray = FloatArray.concat(FloatArray.splice(0, 0));

	var StartNumber = 0;
	var EndNumber = 2;
	var TrapezeLevel = 0;

	print("Точки для усреднения с DMM:")
	for(var i = StartNumber; i <= EndNumber; i++)
	{
		p(TrapezeArray[i]);
	}
	print("---------------");
	
	for (var j = StartNumber; j <= EndNumber; j++)
	{
		TrapezeLevel = TrapezeLevel + TrapezeArray[j];
	}
	TrapezeLevel = (TrapezeLevel / (EndNumber - StartNumber + 1));

	return TrapezeLevel;
}
function CAL_DMM6500_Err(Voltage)
{
	if(Voltage <= 0.1)
		var Err_DMM = ((3 * Math.pow(10, -5) * Voltage + 3.5 * Math.pow(10, -5) * 0.1) / Voltage) * 100;

	if(Voltage > 0.1 && Voltage <= 1)
		var Err_DMM = ((2.5 * Math.pow(10, -5) * Voltage + 6 * Math.pow(10, -5) * 1) / Voltage) * 100;

	if(Voltage > 1 && Voltage <= 10)
		var Err_DMM = ((2.5 * Math.pow(10, -5) * Voltage + 5 * Math.pow(10, -6) * 10) / Voltage) * 100;

	if(Voltage > 10)
		var Err_DMM = ((4 * Math.pow(10, -5) * Voltage + 6 * Math.pow(10, -6) * 100) / Voltage) * 100;

	return Err_DMM;
}

function CAL_PlotUcesat()
{
	scattern(CAL_UcesatSc, CAL_UcesatErr, "Voltage (in mV)", "Error (in %)", "Ucesat relative error " 
		+ CAL_UcesatMin[CAL_VoltageRange] + " ... " + CAL_UcesatMax[CAL_VoltageRange] + " mV, " + CAL_measuring_device);
	scattern(CAL_UcesatSc, CAL_UcesatErrSum, "Voltage (in mV)", "Error, (in %)", "Ucesat summary error, " 
		+ CAL_UcesatMin[CAL_VoltageRange] + " ... " + CAL_UcesatMax[CAL_VoltageRange] + " mV, " + CAL_measuring_device);
}

function CAL_PlotIce(PrintIset, PrintIce)
{
	if(PrintIset)
	{
		scattern(CAL_IceSc, CAL_IsetErr, "Current (in A)", "Error (in %)", "Ice set relative error " 
			+ CAL_IceMin[CAL_CurrentRange] + " ... " + CAL_IceMax[CAL_CurrentRange] + " A, " + CAL_measuring_device);
		scattern(CAL_IceSc, CAL_IsetErrSum, "Current (in A)", "Error, %", "Ice set summary error, " 
			+ CAL_IceMin[CAL_CurrentRange] + " ... " + CAL_IceMax[CAL_CurrentRange] + " А, " + CAL_measuring_device);
	}

	if(PrintIce)
	scattern(CAL_IceSc, CAL_IceErr, "Current (in A)", "Error (in %)", "Ice relative error " 
		+ CAL_IceMin[CAL_CurrentRange] + " ... " + CAL_IceMax[CAL_CurrentRange] + " A, " + CAL_measuring_device);
}

function CAL_PlotUge()
{
	scattern(CAL_UgeSc, CAL_UgeErr, "Voltage (in V)", "Error (in %)", "Uge relative error " 
		+ CAL_UgeMin + " ... " + CAL_UgeMax + " V, " + CAL_measuring_device);
	scattern(CAL_UgeSc, CAL_UgeSetErr, "Voltage (in V)", "Error (in %)", "Uge set relative error " 
		+ CAL_UgeMin + " ... " + CAL_UgeMax + " V, " + CAL_measuring_device);
	scattern(CAL_UgeSc, CAL_UgeSetErrSum, "Voltage (in V)", "Error (in %)", "Uge set summary error " 
		+ CAL_UgeMin + " ... " + CAL_UgeMax + " V, " + CAL_measuring_device);
}

function CAL_KEI_Init()
{
	KEI_ConfigVoltageDC(CAL_NPLC);
	KEI_MakeTestBufferVoltageDC(CAL_NPLC, CAL_V_PulsePlate);
	KEI_ConfigExtTrigger(CAL_V_TriggerDelay);
}

function CAL_TriggerInit(Channel)
{
	TEK_TriggerInit(CAL_chSync, 2.5);
	//TEK_Send("trigger:main:edge:slope fall");
	TEK_Busy();
}

function CAL_TekInit(Channel)
{
	TEK_Horizontal("250e-6", "750e-6");
	TEK_ChannelInit(Channel, "1", "2");
	TEK_MeasMaxInit(Channel, Channel);
	TEK_Busy();
}

function CAL_GateTekInit(Channel)
{
	TEK_Horizontal("500e-6", "-500e-6");
	TEK_ChannelInit(Channel, "1", "2");
	TEK_MeasMaxInit(Channel, Channel);
	TEK_Busy();
}

// Reset Arrays
function CAL_ResetA()
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

	// Summary error
	CAL_UcesatErrSum = [];
	CAL_IsetErrSum = [];
	CAL_UgeSetErrSum = [];
}

// Save
function CAL_SaveUcesat(NameUcesat)
{
	CGEN_SaveArrays(NameUcesat, CAL_Ucesat, CAL_UcesatSc, CAL_UcesatErr);
}

function CAL_SaveIce(NameIce)
{
	CGEN_SaveArrays(NameIce, CAL_Ice, CAL_IceSc, CAL_IceErr);
}

function CAL_SaveIset(NameIset)
{
	CGEN_SaveArrays(NameIset, CAL_IceSc, CAL_Iset, CAL_IsetErr);
}

function CAL_SaveUge(NameUge)
{
	CGEN_SaveArrays(NameUge, CAL_Uge, CAL_UgeSc, CAL_UgeErr);
}

function CAL_SaveUgeSet(NameUgeSet)
{
	CGEN_SaveArrays(NameUgeSet, CAL_UgeSc, CAL_UgeSet, CAL_UgeErr);
}

// Cal
function CAL_CalUcesat(P2, P1, P0)
{
	switch (CAL_VoltageRange)
	{
		case 0:
			dev.wf(10, P2);
			dev.wf(11, P1);
			dev.wf(12, P0);
			break;
		case 1:
			dev.wf(55, P2);
			dev.wf(56, P1);
			dev.wf(57, P0);
			break;
		default:
			print("Incorrect U range.");
			break;
	}
}

function CAL_CalIce(P2, P1, P0)
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

function CAL_CalIset(P2, P1, P0)
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

function CAL_CalUge(P2, P1, P0)
{
	dev.wf(15, P2);
	dev.wf(16, P1);
	dev.wf(17, P0);
}

function CAL_CalUgeSet(P2, P1, P0)
{
	dev.wf(20, P2);
	dev.wf(21, P1);
	dev.wf(22, P0);
}

// Print
function CAL_PrintCoefUcesat()
{
	switch (CAL_VoltageRange)
	{
		case 0:
			print("Ucesat 0 P2 (reg 10): " + dev.rf(10));
			print("Ucesat 0 P1 (reg 11): " + dev.rf(11));
			print("Ucesat 0 P0 (reg 12): " + dev.rf(12));
			break;
		case 1:
			print("Ucesat 1 P2 (reg 55): " + dev.rf(55));
			print("Ucesat 1 P1 (reg 56): " + dev.rf(56));
			print("Ucesat 1 P0 (reg 57): " + dev.rf(57));
			break;
		default:
			print("Incorrect U range.");
			break;
	}
}

function CAL_PrintCoefIce()
{
	switch (CAL_CurrentRange)
	{
		case 0:
			print("Ice 0 P2 (reg 0): " + dev.rf(0));
			print("Ice 0 P1	(reg 1): " + dev.rf(1));
			print("Ice 0 P0	(reg 2): " + dev.rf(2));
			break;
		case 1:
			print("Ice 1 P2 (reg 5): " + dev.rf(5));
			print("Ice 1 P1 (reg 6): " + dev.rf(6));
			print("Ice 1 P0 (reg 7): " + dev.rf(7));
			break;
		default:
			print("Incorrect I range.");
			break;
	}
}

function CAL_PrintCoefIset()
{
	switch (CAL_CurrentRange)
	{
		case 0:
			print("IceSet P2 (reg 30): " + dev.rf(30));
			print("IceSet P1 (reg 31): " + dev.rf(31));
			print("IceSet P0 (reg 32): " + dev.rf(32));
			break;
		case 1:
			print("Ice 1 P2 (reg 50): " + dev.rf(50));
			print("Ice 1 P1 (reg 51): " + dev.rf(51));
			print("Ice 1 P0 (reg 52): " + dev.rf(52));
			break;
		default:
			print("Incorrect I range.");
			break;
	}
}

function CAL_PrintCoefUge()
{
	print("Uge P2 (reg 15): " + dev.rf(15));
	print("Uge P1 (reg 16): " + dev.rf(16));
	print("Uge P0 (reg 17): " + dev.rf(17));
}

function CAL_PrintCoefUgeSet()
{
	print("Uge Set P2 (reg 20): " + dev.rf(20));
	print("Uge Set P1 (reg 21): " + dev.rf(21));
	print("Uge Set P0 (reg 22): " + dev.rf(22));
}

// Reset
function CAL_ResetUcesatCal()
{
	CAL_CalUcesat(0, 1, 0);
}

function CAL_ResetIceCal()
{
	CAL_CalIce(0, 1, 0);
}

function CAL_ResetIsetCal()
{
	CAL_CalIset(0, 1, 0);
}

function CAL_ResetUgeCal()
{
	CAL_CalUge(0, 1, 0);
}

function CAL_ResetUgeSetCal()
{
	CAL_CalUgeSet(0, 1, 0);
}