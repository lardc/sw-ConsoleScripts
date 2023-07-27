// Дополнения для скрипта "CALDRCU016.js"

include("Tektronix.js")
include("CalGeneral.js")


//-------------------------------------------------------------------------------------------------------------------------------------------
//Блок задания параметров формирования в DCU
function CONFIG_UNIT(Unit, Current, CurrentRate)
{

	dev.nid(Unit);
	dev.w(128, Current);
	dev.w(129, CurrentRate);
	if(dev.r(192) == 3)
		{

		dev.c(100);

		}
}

//-------------------------------------------------------------------------------------------------------------------------------------------
//Аdditional Functions 
function CAL_ResetA()
{	
	// Results storage
	cal_Id = [];
	cal_Idset = [];
	cal_Irateset = [];
	cal_VintPS = [];

	// Tektronix data
	cal_IdSc = [];
	cal_IdSc = [];
	cal_IrateSc = [];

	// Relative error
	cal_IdErr = [];
	cal_IdsetErr = [];
	cal_IrateErr = [];

	// Correction
	cal_IdCorr = [];
	cal_IdsetCorr = [];
	cal_IrateCorr = [];
	
	// Data arrays
	cdcu_scatter = [];
}

//--------------------

function CAL_TekInitId()
{
	TEK_ChannelInit(Cal_chMeasureId, "1", "0.02");
	TEK_TriggerInit(Cal_chMeasureId, "0.06");
	TEK_Send("trigger:main:edge:slope fall");
	TEK_Horizontal("0.5e-3", "0.4e-3");
	TEK_Send("measurement:meas" + Cal_chMeasureId + ":source ch" + Cal_chMeasureId);
	TEK_Send("measurement:meas" + Cal_chMeasureId + ":type maximum");
}

//--------------------

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
			DCU_TekScaleId(Cal_chMeasureId, CurrentValues[j] * UnitEn * Cal_Rshunt / 1000000);
			sleep(800);
			while (dev.r(197) !=0)
				{
					sleep(500);
				}
		
			for (var k = 0; k < AvgNum; k++)
				{
				DRCU_Pulse(CurrentValues[j], CurrentRateNTest );
				}

			// Unit data
			dev.nid(160);
			var Id = dev.r(202) * UnitEn / 10;
			Cal_Id.push(Id);
			print("Id, A: " + Id);
			
			var IdSet = dev.r(128) * UnitEn;
			Cal_Idset.push(IdSet);
			print("Idset, A: " + IdSet);

			// Scope data
			var IdSc = (CAL_MeasureId(Cal_chMeasureId) / Cal_Rshunt * 1000).toFixed(2);
			Cal_IdSc.push(IdSc);
			print("Idtek, A: " + IdSc);

			// Relative error
			var IdErr = ((Id - IdSc) / IdSc * 100).toFixed(2);
			Cal_IdErr.push(IdErr);
			print("Iderr, %: " + IdErr);
			
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

function CAL_SaveId(NameId)
{
	CGEN_SaveArrays(NameId, cal_Id, cal_IdSc, cal_IdErr);
}

//--------------------

function DCU_TekScaleId(Channel, Value)
{
	Value = Value / 7;
	TEK_Send("ch" + Channel + ":scale " + Value);
	TEK_TriggerInit(Cal_chMeasureId, Value * 6);
	TEK_Send("trigger:main:edge:slope fall");
}

//--------------------

function CAL_MeasureId(Channel)
{
	return (TEK_Exec("measurement:meas1:value?") * 1000).toFixed(1);
}


//--------------------

function CAL_TekInitIrateDCU()
{
	TEK_ChannelInit(cal_chMeasureId, "1", "0.02");
	TEK_TriggerInit(cal_chMeasureId, "0.06");
	TEK_Send("ch" + cal_chMeasureId + ":position -4");
	TEK_Send("trigger:main:edge:slope fall");
	TEK_Send("measurement:meas" + cal_chMeasureId + ":source ch" + cal_chMeasureId);
	TEK_Send("measurement:meas" + cal_chMeasureId + ":type maximum");
	TEK_Send("measurement:meas1:source ch" + cal_chMeasureId);
	TEK_Send("measurement:meas1:type maximum");
	TEK_Send("measurement:meas2:source ch" + cal_chMeasureId);
	TEK_Send("measurement:meas2:type fall");
	TEK_Send("CURSor:HBArs:POSITION 0.1");
	CAL_TekSetHorizontalScale();
}

//--------------------

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
			TEK_Horizontal("10e-6", "0");
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
	

	for (var i = 0; i < IterationsCount; i++)
	{
		
			for (var j = 0; j < CurrentValues.length; j++)
			{
				print("-- result " + Cal_CntDone++ + " of " + Cal_CntTotal + " --");

				DCU_TekScaleId(Cal_chMeasureId, CurrentValues[j] * UnitEn * Cal_Rshunt * 1e-6);
				TEK_Send("horizontal:scale "  + ((CurrentValues[j] * UnitEn / CurrentRate[CurrentRateNTest]) * 1e-6) * 0.25 / UnitEn);
				TEK_Send("horizontal:main:position "+ ((CurrentValues[j] * UnitEn / CurrentRate[CurrentRateNTest]) * 1e-6) * 0.4 / UnitEn);
				sleep(100);
				while (dev.r(197) !=0)
				{
					p(dev.r(197));
					sleep(500);
				}
				for (var m = 0; m < AvgNum; m++)
				{
					DRCU_Pulse(CurrentValues[j], CurrentRateN[CurrentRateNTest])
				}
				sleep(1000);
				
				CAL_MeasureIrate(CurrentRate[CurrentRateNTest] * UnitEn, CurrentValues[j] * UnitEn);
				if (anykey()) return 0;
			}				
	}
			scattern(Cal_IdSc, Cal_IrateErr, "Current (in A)", "Error (in %)", "DCU Current rate relative error " + CurrentRate[CurrentRateNTest] * UnitEn + " A/us");
	save("data/dcu_404.csv", Cdcu_scatter);
	return 1;
}

//--------------------

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
	
	print("Voltage, V = " + dev.r(201));
	print("di/dt Set, A/us = " + RateSet);	
	print("di/dt Osc, A/us = " + RateScope);	
	print("di/dt Err, % = " + RateErr);

	return RateScope;	
}

//--------------------

function CAL_ResetIdCal()
{
	CAL_SetCoefId(0, 1, 0);
}

//--------------------

function CAL_ResetIdsetCal()
{
	CAL_SetCoefIdset(0, 1, 0);
}

//--------------------

function CAL_SaveIdset(NameIdset)
{
	CGEN_SaveArrays(NameIdset, cal_IdSc, cal_Idset, cal_IdsetErr);
}

//--------------------

function CAL_PrintCoefId()
{
	print("Id P2 x1e6		: " + dev.rs(8));
	print("Id P1 x1000		: " + dev.rs(7));
	print("Id P0 			: " + dev.rs(6));
}

//--------------------

function CAL_PrintCoefIdset()
{
	print("Idset P2 x1e6	: " + dev.rs(124));
	print("Idset P1 x1000	: " + dev.rs(123));
	print("Idset P0 		: " + dev.rs(122));
}

//--------------------

function CAL_SetCoefId(P2, P1, P0)
{
	dev.ws(8, Math.round(P2 * 1e6));
	dev.w(7, Math.round(P1 * 1000));
	dev.ws(6, Math.round(P0));	
}

//--------------------

function CAL_SetCoefIdset(P2, P1, P0)
{
	dev.ws(124, Math.round(P2 * 1e6));
	dev.w(123, Math.round(P1 * 1000));
	dev.ws(122, Math.round(P0));	
}

//--------------------

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
		TEK_Send("horizontal:main:position "+ ((CurrentValues[j] / CurrentRate[CurrentRateNTest]) * 1e-6) * 0.4);

		for (var i = 0; i < Cal_Points; i++)
		{
			TEK_AcquireSample();
			TEK_AcquireAvg(AvgNum);
		
			Voltage = Math.round((VoltageMin + (VoltageMax - VoltageMin) / 2) * 10) / 10;
			
			p("-------------------------");
			p("-------------------------");
			dev.w(130, Voltage * 10);

			p("Voltage DCU : " + Voltage);

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

	save(Cgen_correctionDir + "/" + NameIintPS + ".csv", Cal_Idset);
	save(Cgen_correctionDir + "/" + NameVintPS + ".csv", Cal_VintPS);
	
	return 1;
}


//--------------------
function CAL_CompensationIratecorr(NameIintPS, NameVintPS, NameVintPScorr)
{
	
	var LoadI = [];
	var LoadV = [];
	var Csv_array = [];
	LoadI = load(cgen_correctionDir + "/" + NameIintPS + ".csv");
	LoadV = load(cgen_correctionDir + "/" + NameVintPS + ".csv");

	for (var l = 0; l < LoadI.length; l++)
	{

		Cal_Vintcorr.push ((P4corr * 10000000)/(LoadI[l]*LoadI[l]*LoadI[l]*LoadI[l]));
		Cal_VintPStotal.push (LoadV[l] - Cal_Vintcorr[l]);
	
		Csv_array.push(LoadI[l] + ";" + Cal_VintPStotal[l] + ";" + LoadV[l] + ";" + Cal_Vintcorr[l]);
	}
	save(Cgen_correctionDir + "/" + NameVintPScorr + ".csv", Csv_array);
}
//--------------------
function CAL_SaveVintPS(NameVintPS)
{	
	var Csv_array = [];
	
	for (var i = 0; i < Cal_Idset.length; i++)
		Csv_array.push(Cal_Idset[i] + ";" + Cal_VintPS[i]);
	
	save(Cgen_correctionDir + "/" + NameVintPS + ".csv", Csv_array);
}

//--------------------

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
			print("Irate compensation K4 x1e7	: 71 : " + dev.rs(76));
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