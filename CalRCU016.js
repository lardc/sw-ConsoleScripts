//Скрипт для Калибровки и Верификации блока DCU
//Подключение библиотек

include("TestDRCU.js")
include("Tektronix.js")
include("CalGeneral.js")
include("TestQRR.js")

// Calibration setup parameters
Cal_Rshunt = 1000;	// uOhm
Cal_Points = 10;
Cal_Iterations = 1;
Cal_UseAvg = 1;

// CurrentArray
Cal_IdMin = 100;	
Cal_IdMax = 1100;
Cal_IdStp = 100;

// VoltageRete
Cal_IntPsVmin = 90;	// V
Cal_IntPsVmax = 140;

//CurrentRate
CurrentRateNTest = 0;
CurrentRateN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
CurrentRate = [0.167, 0.25, 0.334, 0.834, 1.667, 2.5, 3.334, 5, 8.334, 10, 16.667]; // in A/us 1, 1.5, 2, 5, 10, 15, 20, 30, 50, 60, 100

// Counters
Cal_CntTotal = 0;
Cal_CntDone = 0;

// Channels
Cal_chMeasureId = 1;
Cal_chSync = 3;

// Results storage
Cal_Id = [];
Cal_Idset = [];
Cal_Irate = [];
Cal_VintPS = [];
Cal_VintPStotal = [];
Cal_Vintcorr = [];

// Tektronix data
Cal_IdSc = [];
Cal_Irate = [];

// Relative error
Cal_IdErr = [];
Cal_IdsetErr = [];
Cal_Irate = [];

// Correction
P4_corr = 0;
Cal_IdCorr = [];
Cal_IdsetCorr = [];
Cal_IrateCorr = [];

// Data arrays
Cdcu_scatter = [];

//--------------------
//--------------------

//Function first setting

//--------------------
// Функция инициализации портов блока и осциллографа

function CAL_Init(portDevice, portTek, ChannelMeasureId)
{
if (ChannelMeasureId < 1 || ChannelMeasureId > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	Cal_chMeasureId = ChannelMeasureId;

	// Init device port
	dev.Disconnect();
	dev.Connect(portDevice);

	// Init Tektronix port
	TEK_PortInit(portTek);
	
	// Tektronix init
	for (var i = 1; i <= 4; i++)
	{
		if (i == ChannelMeasureId)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
	Cal_IdStp = (Cal_IdMax - Cal_IdMin ? Cal_IdMax - Cal_IdMin : 1) / Cal_Points;
}

//--------------------
//--------------------

//Verification Function 

//--------------------
// Функция верификации тока для указаной скорости

function CAL_VerifyId(CurrentRateNTest)
{
	//Reset values
	CAL_ResetA();

	// Tektronix init
	CAL_TekInitId();

	// Reload values
	var CurrentArray = CGEN_GetRange(Cal_IdMin, Cal_IdMax, Cal_IdStp);
 
	if (CAL_CollectId(CurrentArray, Cal_Iterations, CurrentRateNTest))
		{
		CAL_SaveId("RCU_Idset_fixed");

		// Plot relative error distribution
		scattern(Cal_IdSc, Cal_IdsetErr, "Current (in A)", "Error (in %)", "Current set relative error");
		}
	}	

//--------------------
// Функция верификации скорости спада для указаной скорости

function CAL_VerifyIrate(CurrentRateNTest)
{		
	CAL_ResetA();
	
	// Tektronix init
	CAL_TekInitIrate();
	
	// Reload values
	var CurrentArray = CGEN_GetRange(Cal_IdMin, Cal_IdMax, Cal_IdStp);
	CAL_CollectIrate(CurrentArray, Cal_Iterations, CurrentRateNTest);		
}


//--------------------
// Функция верификации всех скоростей и тока

function CAL_VerifyALL()
{

	for (var p = 0; p < 11 ; p++)
	{
		
	CAL_VerifyIrate(p);

	CAL_VerifyId(p);

    }

}
//--------------------
//--------------------

//Calibration Function

//--------------------
// Функция калибровки скорости спада для указаной скорости

function CAL_CalibrateIrate(CurrentRateNTest)
{
	CAL_ResetA();
	
	// Tektronix init
	CAL_TekInitIrate();
	
	// Reload values
	var CurrentArray = CGEN_GetRange(Cal_IdMin, Cal_IdMax, Cal_IdStp);

	if (CAL_CompensationIrate(CurrentArray, CurrentRateNTest, "RCU_IintPS","RCU_VintPS"))
	{
		// Additional correction
		CAL_CompensationIratecorr("RCU_IintPS","RCU_VintPS","RCU_VintPScorr", CurrentRateNTest);
		// Calculate correction
		Cal_IrateCorr = CGEN_GetCorrection2("RCU_VintPScorr");
		CAL_SetCoefIrateCompens(Cal_IrateCorr[0], Cal_IrateCorr[1], Cal_IrateCorr[2], CurrentRateNTest);
		CAL_PrintCoefIrateCompens(CurrentRateNTest);
	}	
}

//--------------------
// Функция ручного пересчета скорости спада (для изменения P4)

function Hand_Cal_CompensationIrate(CurrentRateNTest)
{
	CAL_CompensationIratecorr("RCU_IintPS","RCU_VintPS","RCU_VintPScorr", CurrentRateNTest);
	Cal_IrateCorr = CGEN_GetCorrection2("RCU_VintPScorr");
	CAL_SetCoefIrateCompens(Cal_IrateCorr[0], Cal_IrateCorr[1], Cal_IrateCorr[2], CurrentRateNTest);
	CAL_PrintCoefIrateCompens(CurrentRateNTest);
}


//--------------------


//--------------------
//--------------------

//Аdditional Functions

//--------------------
// Функция сброса переменных

	function CAL_ResetA()
{	
	// Results storage
	Cal_Id = [];
	Cal_Idset = [];
	Cal_Irateset = [];
	Cal_VintPStotal = [];
	Cal_VintPS = [];
	Cal_Vintcorr = [];

	// Tektronix data
	Cal_IdSc = [];
	Cal_IrateSc = [];

	// Relative error
	Cal_IdErr = [];
	Cal_IdsetErr = [];
	Cal_IrateErr = [];

	// Correction
	Cal_IdCorr = [];
	Cal_IdsetCorr = [];
	Cal_IrateCorr = [];
	
	// Data arrays
	Cdcu_scatter = [];

	Cal_Volt = [];
}

//--------------------
// Функция выбора вертикальной развертки и тригера для осцилограффа для тока ?

function CAL_TekInitId()
{
	TEK_ChannelInit(Cal_chMeasureId, "1", "0.02");
	TEK_TriggerInit(Cal_chMeasureId, "0.06");
	TEK_Send("trigger:main:edge:slope rise");
	TEK_Horizontal("0.25e-3", "-1.5e-3");
	TEK_Send("measurement:meas" + Cal_chMeasureId + ":source ch" + Cal_chMeasureId);
	TEK_Send("measurement:meas" + Cal_chMeasureId + ":type maximum");
}

//--------------------
// Функция сбора данных для калибровки тока

function CAL_CollectId(CurrentValues, IterationsCount, CurrentRateNTest)
{
	Cal_CntTotal = IterationsCount * CurrentValues.length;
	Cal_CntDone = 1;

	var AvgNum;
	if (Cal_UseAvg)
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
			print("-- result " + Cal_CntDone++ + " of " + Cal_CntTotal + " --");
			//
			DCU_TekScaleId(Cal_chMeasureId, CurrentValues[j] * Cal_Rshunt / 1000000);
			sleep(800);
			while (dev.r(197) !=0)
				{
					sleep(500);
				}
			
			for (var k = 0; k < AvgNum; k++)
				DRCU_Pulse(CurrentValues[j], CurrentRateNTest);
			
			// Unit data
			
			var IdSet = dev.r(128);
			Cal_Idset.push(IdSet);
			print("Idset, A: " + IdSet);

			// Scope data
			var IdSc = (CAL_MeasureId(Cal_chMeasureId) / Cal_Rshunt * 1000).toFixed(2);
			Cal_IdSc.push(IdSc);
			print("Idtek, A: " + IdSc);

			// Relative error
			var IdsetErr = ((IdSet - IdSc) / IdSc * 100).toFixed(2);
			Cal_IdsetErr.push(IdsetErr);
			print("Idseterr, %: " + IdsetErr);
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

//--------------------
// Функция сохранения данных измерения тока 

function CAL_SaveId(NameId)
{
	CGEN_SaveArrays(NameId, Cal_Id, Cal_IdSc, Cal_IdErr);
}

//--------------------
// Функция выбора вертикальной развертки и тригера для осцилограффа для тока

function DCU_TekScaleId(Channel, Value)
{
	Value = Value / 7;
	TEK_Send("ch" + Channel + ":scale " + Value);
	TEK_TriggerInit(Cal_chMeasureId, Value * 6); 
	TEK_Send("trigger:main:edge:slope rise");
}

//--------------------
// Функция возвращения значения тока от осцилограффа

function CAL_MeasureId(Channel)
{
	return (TEK_Exec("measurement:meas1:value?") * 1000).toFixed(1);
}


//--------------------
// Функция выбора вертикальной развертки и тригера для осцилограффа для скорости спада

function CAL_TekInitIrate()
{
	TEK_ChannelInit(Cal_chMeasureId, "1", "0.02");
	TEK_TriggerInit(Cal_chMeasureId, "0.1");
	TEK_Send("ch" + Cal_chMeasureId + ":position -4");
	TEK_Send("trigger:main:edge:slope rise");
	TEK_Send("measurement:meas" + Cal_chMeasureId + ":source ch" + Cal_chMeasureId);
	TEK_Send("measurement:meas" + Cal_chMeasureId + ":type maximum");
	TEK_Send("measurement:meas1:source ch" + Cal_chMeasureId);
	TEK_Send("measurement:meas1:type maximum");
	TEK_Send("measurement:meas2:source ch" + Cal_chMeasureId);
	TEK_Send("measurement:meas2:type rise");
	TEK_Send("CURSor:HBArs:POSITION 0.1");
	CAL_TekSetHorizontalScale();
}

//--------------------
// Функция выбора горизонтальной развертки для осцилограффа

function CAL_TekSetHorizontalScale()
{
	switch(CurrentRateN)

	{
		case 0:
			TEK_Horizontal("100e-6", "0");
			break;
		case 1:
			TEK_Horizontal("100e-6", "0");
			break;
		case 2:
			TEK_Horizontal("50e-6", "0");
			break;
		case 3:
			TEK_Horizontal("25e-6", "0");
			break;
		case 4:
			TEK_Horizontal("25e-6", "0");
			break;
		case 5:
			TEK_Horizontal("10e-6", "0");
			break;
		case 6:
			TEK_Horizontal("5e-6", "0");
			break;
		case 7:
			TEK_Horizontal("5e-6", "0");
			break;
		case 8:
			TEK_Horizontal("2.5e-6", "0");
			break;
		case 9:
			TEK_Horizontal("2.5e-6", "0");
			break;
		case 10:
			TEK_Horizontal("1e-6", "0");
			break;
	}
}

//--------------------
// Функция сбора данных для калибровки скорости спада

function CAL_CollectIrate(CurrentValues, IterationsCount, CurrentRateNTest)
{
	Cal_CntTotal = IterationsCount * CurrentValues.length;
	Cal_CntDone = 1;

	var AvgNum;
	if (Cal_UseAvg)
	{
		AvgNum = 4;
		TEK_AcquireAvg(AvgNum);
	}
	else
	{
		AvgNum = 1;
		TEK_AcquireSample();
	}
	
	Cal_IdSc = [];
	Cal_IdsetErr = [];
	Cal_IrateErr = [];
	Cal_Volt = [];
	

	for (var i = 0; i < IterationsCount; i++)
	{
		
			for (var j = 0; j < CurrentValues.length; j++)
			{
//___________________________________________________________				
			//	print("Enter Temp unit");
			//	Temp = readline();
			//	dev.w(131,Temp);
//___________________________________________________________
				print("-- result " + Cal_CntDone++ + " of " + Cal_CntTotal + " --");

				DCU_TekScaleId(Cal_chMeasureId, CurrentValues[j] * Cal_Rshunt * 1e-6);
				TEK_Send("horizontal:scale "  + ((CurrentValues[j] / CurrentRate[CurrentRateNTest]) * 1e-6) * 0.25);
				TEK_Send("horizontal:main:position "+ ((CurrentValues[j] / CurrentRate[CurrentRateNTest]) * 1e-6) * -0.5);
				sleep(100);
				while (dev.r(197) !=0)
				{
					sleep(500);
				}
				for (var m = 0; m < AvgNum; m++)
				{
					if(!DRCU_Pulse(CurrentValues[j], CurrentRateN[CurrentRateNTest]))
						return 0;
				}
				sleep(1000);
				
				CAL_MeasureIrate(CurrentRate[CurrentRateNTest], CurrentValues[j]);
				if (anykey()) return 0;
			}	
	}
		scattern(Cal_IdSc, Cal_IrateErr, "Current (in A)", "Error (in %)", "DCU Current rate relative error " + CurrentRate[CurrentRateNTest] + " A/us");
		save("data/dcu_404.csv", Cdcu_scatter);
	return 1;
}

//--------------------
// Функция перевода полученных значений при сборе и сохранения

function CAL_MeasureIrate(RateSet, CurrentSet)
{
	var RateScope = (TEK_Measure(Cal_chMeasureId) * 0.8 / Cal_Rshunt * 1e6 / TEK_Exec("measurement:meas2:value?") * 1e-6).toFixed(3);
	var RateErr = ((RateScope - RateSet) / RateSet * 100).toFixed(2);
	
	var CurrentScope = (TEK_Measure(Cal_chMeasureId) / (Cal_Rshunt * 1e-6)).toFixed(2);
	var CurrentErr = ((CurrentScope - CurrentSet) / CurrentSet * 100).toFixed(2);
	
	Cdcu_scatter.push(RateSet + ";" + RateScope + ";" + RateErr + ";" + CurrentSet + ";" + CurrentScope + ";" + CurrentErr);
	
	Cal_IdSc.push(CurrentScope);
	Cal_IdsetErr.push(CurrentErr);
	Cal_IrateErr.push(RateErr);

	print("Current Set, A = " + CurrentSet);	
	print("Current Osc, A = " + CurrentScope);	
	print("Current Err, % = " + CurrentErr);
//___________________________________________________________	
	Voltage = dev.r(201);
	print("Voltage, V = " + Voltage / 10);
	Cal_Volt.push(Voltage); 
	save(cgen_correctionDir + "/" + "VoltageRCU" + ".csv", Cal_Volt);
//___________________________________________________________	
	print("di/dt Set, A/us = " + RateSet);	
	print("di/dt Osc, A/us = " + RateScope);	
	print("di/dt Err, % = " + RateErr);

	return RateScope;	
}

//--------------------
// Функция сохранения данных задания тока

function CAL_SaveIdset(NameIdset)
{
	CGEN_SaveArrays(NameIdset, Cal_IdSc, Cal_Idset, Cal_IdsetErr);
}

//--------------------
// Функция подбора напряжения относительно тока для указанной скорости

function CAL_CompensationIrate(CurrentValues, CurrentRateNTest, NameIintPS, NameVintPS)
{	
	Cal_CntTotal = CurrentValues.length;
	Cal_CntDone = 1;
		

	var AvgNum, VoltageMin, VoltageMax, Voltage;
	
	if (Cal_UseAvg)
		AvgNum = 4;
	else
		AvgNum = 1;

	for (var j = 0; j < CurrentValues.length; j++)
	{
		
		print("-- result " + Cal_CntDone++ + " of " + Cal_CntTotal + " --");
		
		VoltageMin = Cal_IntPsVmin;
		VoltageMax = Cal_IntPsVmax;

		DCU_TekScaleId(Cal_chMeasureId, CurrentValues[j] * Cal_Rshunt * 1e-6);
		TEK_Send("horizontal:scale "  + ((CurrentValues[j] / CurrentRate[CurrentRateNTest]) * 1e-6) * 0.25);
		TEK_Send("horizontal:main:position "+ ((CurrentValues[j] / CurrentRate[CurrentRateNTest]) * 1e-6) * -0.5);

		for (var i = 0; i < Cal_Points; i++)
		{
			TEK_AcquireSample();
			TEK_AcquireAvg(AvgNum);
		
			Voltage = Math.round((VoltageMin + (VoltageMax - VoltageMin) / 2) * 10) / 10;
			
			p("-------------------------");
			p("-------------------------");
			dev.w(130, Voltage * 10);

			p("Voltage RCU : " + Voltage);

			p("Current, A : " + CurrentValues[j]);
			p("VintPS max : " + VoltageMax);
			p("VintPS,  V : " + Voltage);
			p("VintPS min : " + VoltageMin);
			p("-------------");
			
			for (var n = 0; n < AvgNum; n++)
				if(!DRCU_Pulse(CurrentValues[j], CurrentRateN[CurrentRateNTest]))
					return 0;				

			
			var IrateSc = CAL_MeasureIrate(CurrentRate[CurrentRateNTest],CurrentValues[j]);
			
			if(IrateSc < CurrentRate[CurrentRateNTest])

				VoltageMin = Voltage;

			else
			{
				if(IrateSc > CurrentRate[CurrentRateNTest])

					VoltageMax = Voltage;
				else
					break;
			
			if((VoltageMin + 0.2) >= VoltageMax)
				break;
			
			if (anykey()) return 0;

			}
		}
		Cal_Idset.push(CurrentValues[j]);
		Cal_VintPS.push (Voltage * 10);

	}	
	dev.w(130, 0);	

	save(cgen_correctionDir + "/" + NameIintPS + ".csv", Cal_Idset);
	save(cgen_correctionDir + "/" + NameVintPS + ".csv", Cal_VintPS);
	
	return 1;
}


//--------------------
//Функция пересчета полученых значений для указанной скорости

function CAL_CompensationIratecorr(NameIintPS, NameVintPS, NameVintPScorr, CurrentRateNTest)
{
	CAL_ResetA();
	P4_corr = (dev.r(43 + 4 * CurrentRateNTest));
	var LoadI = [];
	var LoadV = [];
	var Csv_array = [];
	LoadI = load(cgen_correctionDir + "/" + NameIintPS + ".csv");
	LoadV = load(cgen_correctionDir + "/" + NameVintPS + ".csv");

	for (var l = 0; l < LoadI.length; l++)
	{

		Cal_Vintcorr.push ((P4_corr * 1000)/(LoadI[l]));
		
		Cal_VintPStotal.push (LoadV[l] - Cal_Vintcorr[l]);
	
		Csv_array.push(LoadI[l] + ";" + Cal_VintPStotal[l] + ";" + LoadV[l] + ";" + Cal_Vintcorr[l]);
	}
	save(cgen_correctionDir + "/" + NameVintPScorr + ".csv", Csv_array);
}

//--------------------
//Функция записи регистров для указаной скорости 

function CAL_SetCoefIrateCompens(K2, K, Offset, CurrentRateNTest)
{
	K2 = parseFloat(K2);
	K = parseFloat(K);
	Offset = parseFloat(Offset);
	
	switch(CurrentRateNTest)
	{
		case 0:
			dev.ws(40, Offset);
			dev.ws(41, K * 1000);
			dev.ws(42, K2 * 1e6);
			break;
		case 1:
			dev.ws(44, Offset);
			dev.ws(45, K * 1000);
			dev.ws(46, K2 * 1e6);
			break;
		case 2:
			dev.ws(48, Offset);
			dev.ws(49, K * 1000);
			dev.ws(50, K2 * 1e6);
			break;
		case 3:
			dev.ws(52, Offset);
			dev.ws(53, K * 1000);
			dev.ws(54, K2 * 1e6);
			break;
		case 4:
			dev.ws(56, Offset);
			dev.ws(57, K * 1000);
			dev.ws(58, K2 * 1e6);
			break;
		case 5:
			dev.ws(60, Offset);
			dev.ws(61, K * 1000);
			dev.ws(62, K2 * 1e6);
			break;
		case 6:
			dev.ws(64, Offset);
			dev.ws(65, K * 1000);
			dev.ws(66, K2 * 1e6);
			break;
		case 7:
			dev.ws(68, Offset);
			dev.ws(69, K * 1000);
			dev.ws(70, K2 * 1e6);
			break;
		case 8:
			dev.ws(72, Offset);
			dev.ws(73, K * 1000);
			dev.ws(74, K2 * 1e6);
			break;
		case 9:
			dev.ws(76, Offset);
			dev.ws(77, K * 1000);
			dev.ws(78, K2 * 1e6);
			break;
		case 10:
			dev.ws(80, Offset);
			dev.ws(81, K * 1000);
			dev.ws(82, K2 * 1e6);
			break;
	}
}

//--------------------
// Функция вызова значений регистров скорости спада для указанной скорости

function CAL_PrintCoefIrateCompens(CurrentRateNTest)
{
	switch(CurrentRateNTest)
	{
		case 0:
			print("Irate compensation Offset	: 40 : " + dev.rs(40));
			print("Irate compensation K x1000	: 41 : " + dev.rs(41));
			print("Irate compensation K2 x1e6	: 42 : " + dev.rs(42));
			print("Irate compensation K4 x1e7	: 43 : " + dev.rs(43));
			break;
		case 1:
			print("Irate compensation Offset	: 44 : " + dev.rs(44));
			print("Irate compensation K x1000	: 45 : " + dev.rs(45));
			print("Irate compensation K2 x1e6	: 46 : " + dev.rs(46));
			print("Irate compensation K4 x1e7	: 47 : " + dev.rs(47));
			break;
		case 2:
			print("Irate compensation Offset	: 48 : " + dev.rs(48));
			print("Irate compensation K x1000	: 49 : " + dev.rs(49));
			print("Irate compensation K2 x1e6	: 50 : " + dev.rs(50));
			print("Irate compensation K4 x1e7	: 51 : " + dev.rs(51));
			break;
		case 3:
			print("Irate compensation Offset	: 52 : " + dev.rs(52));
			print("Irate compensation K x1000	: 53 : " + dev.rs(53));
			print("Irate compensation K2 x1e6	: 54 : " + dev.rs(54));
			print("Irate compensation K4 x1e7	: 55 : " + dev.rs(55));
			break;
		case 4:
			print("Irate compensation Offset	: 56 : " + dev.rs(56));
			print("Irate compensation K x1000	: 57 : " + dev.rs(57));	
			print("Irate compensation K2 x1e6	: 58 : " + dev.rs(58));
			print("Irate compensation K4 x1e7	: 59 : " + dev.rs(59));
			break;
		case 5:
			print("Irate compensation Offset	: 60 : " + dev.rs(60));
			print("Irate compensation K x1000	: 61 : " + dev.rs(61));
			print("Irate compensation K2 x1e6	: 62 : " + dev.rs(62));
			print("Irate compensation K4 x1e7	: 63 : " + dev.rs(63));	
			break;
		case 6:
			print("Irate compensation Offset	: 64 : " + dev.rs(64));
			print("Irate compensation K x1000	: 65 : " + dev.rs(65));
			print("Irate compensation K2 x1e6	: 66 : " + dev.rs(66));
			print("Irate compensation K4 x1e7	: 67 : " + dev.rs(67));
			break;
		case 7:
			print("Irate compensation Offset	: 68 : " + dev.rs(68));
			print("Irate compensation K x1000	: 69 : " + dev.rs(69));
			print("Irate compensation K2 x1e6	: 70 : " + dev.rs(70));
			print("Irate compensation K4 x1e7	: 71 : " + dev.rs(71));
			break;
		case 8:
			print("Irate compensation Offset	: 72 : " + dev.rs(72));
			print("Irate compensation K x1000	: 73 : " + dev.rs(73));
			print("Irate compensation K2 x1e6	: 74 : " + dev.rs(74));
			print("Irate compensation K4 x1e7	: 75 : " + dev.rs(75));
			break;
		case 9:
			print("Irate compensation Offset	: 76 : " + dev.rs(76));
			print("Irate compensation K x1000	: 77 : " + dev.rs(77));
			print("Irate compensation K2 x1e6	: 78 : " + dev.rs(78));
			print("Irate compensation K4 x1e7	: 79 : " + dev.rs(79));	
			break;
		case 10:
			print("Irate compensation Offset	: 80 : " + dev.rs(80));
			print("Irate compensation K x1000	: 81 : " + dev.rs(81));
			print("Irate compensation K2 x1e6	: 82 : " + dev.rs(82));
			print("Irate compensation K4 x1e7	: 83 : " + dev.rs(83));
			break;
	}
}

//--------------------