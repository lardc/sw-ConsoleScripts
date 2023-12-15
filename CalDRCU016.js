//Скрипт для Калибровки и Верификации Блоков DCU и RCU 

 
//Работа с блоками производится через блок QSU 
//	Cal_Reg_En() 				- включает активные блоки
//------------------------------------------------------------------------------------------------------------------------------------------

// Инициализация переменных

//------------------------------------------------------------------------------------------------------------------------------------------

//Подключение библиотек

include("CalGeneral.js")
include("Tektronix.js");
include("Sic_GetData.js");
include("TestDRCU.js");

// Данные активных блоков 

UnitALLDCU = 3; // Количество блоков DCU в комплексе
UnitALLRCU = 3; // Количество блоков RCU в комплексе
UnitEnDCU = 3;	// Количество активных блоков DCU
UnitEnRCU = 3;	// Количество активных блоков RCU

// Calibration setup parameters

Cal_Rshunt = 1000;	// uOhm
Cal_Points = 10;
Cal_Iterations = 3;
Cal_UseAvg = 0;

// CurrentArray на блок

Cal_IdMin = 100;	
Cal_IdMax = 1100;
Cal_IdStp = 100;

//CurrentRate

CurrentRateNTest = 0;
CurrentRateN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
CurrentRateALL = [1, 1.5, 2, 5, 10, 15, 20, 30, 50, 60, 100];
CurrentRate = [0.167, 0.25, 0.334, 0.834, 1.667, 2.5, 3.334, 5, 8.334, 10, 16.667]; 
CurrentTest = 1100;

//
Qrr_idc_width = 2000;		// in us
Qrr_single = 1;
qrr_print = 0;

// Counters

Сal_CntTotal = 0;
Сal_CntDone = 0;

// Channels

Cal_chMeasureId = 1;
Сal_chSync = 3;

// Results storage

Сal_Id = [];
Сal_Idset = [];
Сal_Irate = [];
Сal_VintPS = [];

// Tektronix data

Сal_IdSc = [];
Сal_Irate = [];

// Relative error

Сal_IdErr = [];
Сal_IdsetErr = [];
Сal_Irate = [];

// Correction

Сal_IdCorr = [];
Сal_IdsetCorr = [];
Сal_IrateCorr = [];

// Data arrays

//Температурные коэффиценты 

TempRCU = 0;
TempDCU = 0;
Temp_arrays = [];
Temp_En = 0;

//Напряжение
VDCU = 0;
VRCU = 0;


M_CurrentScopeP = [] ;
M_CurrentScopeN = [] ;
M_RateScope = [];
M_RateErr = [];


//------------------------------------------------------------------------------------------------------------------------------------------

// Главные функции

//------------------------------------------------------------------------------------------------------------------------------------------
// Включение калибровочного регистра

function Cal_Reg_En()
{
	if(dev.r(2) == 0)
		QSU_WriteReg(160, 140, 1);
	if(dev.r(3) == 0)
		QSU_WriteReg(161, 140, 1);
	if(dev.r(4) == 0)
		QSU_WriteReg(162, 140, 1);
	if(dev.r(5) == 0)
		QSU_WriteReg(170, 140, 1);
	if(dev.r(6) == 0)
		QSU_WriteReg(171, 140, 1);
	if(dev.r(7) == 0)
		QSU_WriteReg(172, 140, 1);
}
//------------------------------------------------------------------------------------------------------------------------------------------
// считывание напряжения
function ReadV() 
{
	if(dev.r(2) == 0)
		p("DCU-1 " + QSU_ReadReg(160, 201)/10 + "B")
	if(dev.r(3) == 0)
		p("DCU-2 " + QSU_ReadReg(161, 201)/10 + "B")
	if(dev.r(4) == 0)
		p("DCU-3 " + QSU_ReadReg(162, 201)/10 + "B")
	if(dev.r(5) == 0)
		p("RCU-1 " + QSU_ReadReg(170, 201)/10 + "B")
	if(dev.r(6) == 0)
		p("RCU-2 " + QSU_ReadReg(171, 201)/10 + "B")
	if(dev.r(7) == 0)
		p("RCU-3 " + QSU_ReadReg(172, 201)/10 + "B")
}



//------------------------------------------------------------------------------------------------------------------------------------------
//Чтение регистра из блока через QSU

function QSU_ReadReg(NodeID, Reg)
{
	dev.w(150, NodeID);
	dev.ws(151, Reg);
	dev.c(10);
	
	if (dev.r(230) == 0)
		return dev.rs(231);
	else
	{
		print("Err code: " + dev.r(230));
		return 0;
	}
}
//------------------------------------------------------------------------------------------------------------------------------------------
//Запись в блок через QSU 

function QSU_WriteReg(NodeID, Reg, Value)
{
	dev.w(150, NodeID);
	dev.w(151, Reg);
	dev.w(152, Value);
	dev.c(11);
	
	if (dev.r(230) != 0)
		print("Err code: " + dev.r(230));
}

//------------------------------------------------------------------------------------------------------------------------------------------
//Запись в блок через QSU со знаком 

function QSU_WriteRegS(NodeID, Reg, Value)
{
	dev.w(150, NodeID);
	dev.w(151, Reg);
	dev.ws(152, Value);
	dev.c(11);
	
	if (dev.r(230) != 0)
		print("Err code: " + dev.r(230));
}

//------------------------------------------------------------------------------------------------------------------------------------------
// Активация команды через QSU

function QSU_Call(NodeID, Action)
{
	dev.w(150, NodeID);
	dev.w(151, Action);
	dev.c(12);
	
	if (dev.r(230) != 0)
		print("Err code: " + dev.r(230));
}

//------------------------------------------------------------------------------------------------------------------------------------------
//Чтение EP из блока через QSU

function QSU_ReadArray(NodeID, EndPoint)
{
	dev.w(150, NodeID);
	dev.w(151, EndPoint);
	dev.c(13);
	
	if (dev.r(230) != 0)
		print("Err code: " + dev.r(230));
}

//------------------------------------------------------------------------------------------------------------------------------------------
//Функция настройки осциллографа и выходов

function CAL_Init(portDevice, portTek, channelMeasureI, channelMeasureU)
{
	if (channelMeasureI < 1 || channelMeasureU > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	cal_chMeasureI = channelMeasureI;
	cal_chMeasureU = channelMeasureU;

	// Init device port
	dev.Disconnect();
	dev.Connect(portDevice);

	// Init Tektronix port
	TEK_PortInit(portTek);
	
	// Tektronix init
	for (var i = 1; i <= 4; i++)
	{
		if (i == channelMeasureI || i == channelMeasureU)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
}

//-------------------------------------------------------------------------------------------------------------------------------------------
//Блок формирования одиночного импульса

function QRR_Start(Mode, IDC, IDCFallRate, OSV, OSVRate)
{	
	
	if (dev.r(192) == 1)
	{
		QRR_Status();
		dev.c(3);
		print("Clear fault");
		sleep(500);
	}
	
	if (dev.r(192) == 0)
	{
		print("Power up");
		dev.c(1);
		
		while (dev.r(192) == 3)
		{
			if (anykey()) return;
			sleep(50);
		}
	}
	
	if (dev.r(192) != 4)
	{
		print("Abnormal state = " + dev.r(192));
		return;
	}
	
	dev.w(128, Mode);
	//
	dev.w(129, IDC);
	dev.w(130, Qrr_idc_width);
	dev.w(132, IDCFallRate);
	//
	dev.w(133, OSV);
	dev.w(134, OSVRate);
	
	if (Qrr_single)
		dev.c(102);
	else
	{
		print("Process");
		dev.c(100);
	}
	
	var pulse_counter = dev.r(199);
	while (dev.r(192) == 5)
	{
		if (anykey()) return;
		if (pulse_counter != dev.r(199))
		{
			pulse_counter = dev.r(199);
			if(qrr_print)
				print("Pulse #" + pulse_counter);
		}
		sleep(50);
	}
}

//-------------------------------------------------------------------------------------------------------------------------------------------
//Блок верификации скорости спада и задания тока

function CAL_Verify(CurrentRateNTest)
{		
	CAL_ResetA();
	
	// Tektronix init
	CAL_TekInitIrateDRCU();
	
	// Reload values
	var CurrentArray = CGEN_GetRange(Cal_IdMin, Cal_IdMax, Cal_IdStp);
	CAL_Collect(CurrentArray, Cal_Iterations, CurrentRateNTest);

}
//-------------------------------------------------------------------------------------------------------------------------------------------
//Блок калибровки скорости спада

function CAL_CalibrateIrate(CurrentRateNTest)
{		
	CAL_ResetA();
	
	// Tektronix init
	CAL_TekInitIrateDRCU();
	
	// Reload values
	var CurrentArray = CGEN_GetRange(Cal_IdMin, Cal_IdMax, Cal_IdStp);
	CAL_Collect(CurrentArray, Cal_Iterations, CurrentRateNTest);



}
//-------------------------------------------------------------------------------------------------------------------------------------------

// Дополнения для скрипта "CALDRCU016.js"

//-------------------------------------------------------------------------------------------------------------------------------------------
//Сброс переменных 

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
	Temp_arrays = [];
 
}

//-------------------------------------------------------------------------------------------------------------------------------------------
//Выставление параметров тригера

function DRCU_TekScaleId(Channel, Value)
{
	Value = Value / 7;
	TEK_Send("ch" + Channel + ":scale " + Value);
	 
	if (UnitEnDCU != 0 & UnitEnRCU != 0)
	{
		TEK_TriggerInit(Cal_chMeasureId, 0.05); // поправить пересчет 
		TEK_Send("trigger:main:edge:slope fall");
	}
	else if (UnitEnDCU == 0)
	{	
		TEK_Send("trigger:main:edge:slope rise");
		TEK_TriggerInit(Cal_chMeasureId, Value * 6); // поправить пересчет
	}
	else
	{
		TEK_Send("trigger:main:edge:slope fall");
		TEK_TriggerInit(Cal_chMeasureId, Value * 6); // поправить пересчет
	}	
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// Выставление параметров на осциллографе

function CAL_TekInitIrateDRCU()
{
	

	TEK_ChannelInit(Cal_chMeasureId, "1", "0.02");
	TEK_TriggerInit(Cal_chMeasureId, "0.06");
	TEK_Send("measurement:meas" + Cal_chMeasureId + ":source ch" + Cal_chMeasureId);
	TEK_Send("measurement:meas" + Cal_chMeasureId + ":type maximum");
	TEK_Send("measurement:meas1:source ch" + Cal_chMeasureId);
	TEK_Send("measurement:meas1:type maximum");
	TEK_Send("measurement:meas2:source ch" + Cal_chMeasureId);
	TEK_Send("CURSor:HBArs:POSITION 0.1");
	if (UnitEnDCU == 0)
	{		
		TEK_Send("trigger:main:edge:slope rise");
		TEK_Send("measurement:meas2:type rise");
	}	
	else
	{
		TEK_Send("trigger:main:edge:slope fall");
		TEK_Send("measurement:meas2:type fall");
	}	
	if (UnitEnDCU != 0 & UnitEnRCU != 0)
	{ 
		TEK_Send("ch" + Cal_chMeasureId + ":position 0");
	}
}


//-------------------------------------------------------------------------------------------------------------------------------------------
//Общий сбор данных для верификации

function CAL_Collect(CurrentValues, IterationsCount, CurrentRateNTest)
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
			if (UnitEnDCU != 0 & UnitEnRCU != 0)	
			{
				DRCU_TekScaleId(Cal_chMeasureId, CurrentValues[j] * (UnitEnRCU + UnitEnDCU) * Cal_Rshunt * 1e-6);
				TEK_Send("horizontal:main:position "+ 0);
			}	
			else if (UnitEnDCU == 0)
			{
				DRCU_TekScaleId(Cal_chMeasureId, CurrentValues[j] * UnitEnRCU * Cal_Rshunt * 1e-6);
				TEK_Send("horizontal:main:position "+ ((CurrentValues[j] * (UnitEnDCU + UnitEnRCU) / CurrentRate[CurrentRateNTest]) * 1e-6) * -0.5 / (UnitEnDCU + UnitEnRCU));
			}
			else
			{
				DRCU_TekScaleId(Cal_chMeasureId, CurrentValues[j] * UnitEnDCU * Cal_Rshunt * 1e-6);
				TEK_Send("horizontal:main:position "+ ((CurrentValues[j] * (UnitEnDCU + UnitEnRCU) / CurrentRate[CurrentRateNTest]) * 1e-6) * 0.6 / (UnitEnDCU + UnitEnRCU));
			}	
			TEK_Send("horizontal:scale "  + ((CurrentValues[j] * (UnitEnDCU + UnitEnRCU) / CurrentRate[CurrentRateNTest]) * 1e-6) * 0.3 / (UnitEnDCU + UnitEnRCU));

			sleep(100);
			while (dev.r(197) !=0)
			{
				p(dev.r(197));
				sleep(500);
			}

			for (var m = 0; m < AvgNum; m++)
			{
				if (UnitEnDCU != 0 & UnitEnRCU != 0)
				{
					QRR_Start(0, CurrentValues[j] * UnitEnDCU, CurrentRateN[CurrentRateNTest], 100, 10);
					sleep(1000);
					CAL_MeasureIrate(CurrentRate[CurrentRateNTest] * (UnitEnDCU + UnitEnRCU), CurrentValues[j] * (UnitEnDCU + UnitEnDCU));
				}	
				else if (UnitEnDCU == 0)
				{	
					QRR_Start(0, CurrentValues[j] * UnitEnRCU, CurrentRateN[CurrentRateNTest], 100, 10);
				}
				else
				{
					QRR_Start(0, CurrentValues[j] * UnitEnDCU, CurrentRateN[CurrentRateNTest], 100, 10);
					sleep(1000);
					CAL_MeasureIrate(CurrentRate[CurrentRateNTest] * UnitEnDCU, CurrentValues[j] * UnitEnDCU);
					if (anykey()) return 0;
				}	
			}	
			//sleep(1000);
			//CAL_MeasureIrate(CurrentRate[CurrentRateNTest] * UnitEnRCU, CurrentValues[j] * UnitEnRCU);
			//CAL_MeasureIrate(CurrentRate[CurrentRateNTest] * (UnitEnDCU + UnitEnRCU), CurrentValues[j] * (UnitEnDCU + UnitEnDCU));
			if (anykey()) return 0;
		}				
	}

			scattern(Cal_IdSc, Cal_IrateErr, "Current (in A)", "Error (in %)", "DRCU Current rate relative error " + CurrentRate[CurrentRateNTest] * (UnitEnDCU + UnitEnRCU) + " A/us");
			scattern(Cal_IdSc, Cal_IdsetErr, "Current (in A)", "Error (in %)", "DRCU Set current relative error " + CurrentRate[CurrentRateNTest] * (UnitEnDCU + UnitEnRCU) + " A/us");
			save(cgen_correctionDir + "/" + "TempDRCU" + ".csv", Temp_arrays);

	return 1;
}

//-------------------------------------------------------------------------------------------------------------------------------------------
//Одиночный сбор данных для верификации 

function CAL_MeasureIrate(RateSet, CurrentSet)
{
	if(UnitEnDCU != 0 & UnitEnRCU != 0)
	{	
		var RateScope = ((TEK_Measure(Cal_chMeasureId) - TEK_Measure(3)) * 0.8 / Cal_Rshunt * 1e6 / TEK_Exec("measurement:meas2:value?") * 1e-6).toFixed(3);
		var RateErr = ((RateScope - RateSet) / RateSet * 100).toFixed(2);
	
		var CurrentScope = ((TEK_Measure(Cal_chMeasureId) - TEK_Measure(3)) / (Cal_Rshunt * 1e-6)).toFixed(2);
		var CurrentErr = ((CurrentScope - CurrentSet) / CurrentSet * 100).toFixed(2);
	}
	else
	{
		var RateScope = (TEK_Measure(Cal_chMeasureId) * 0.8 / Cal_Rshunt * 1e6 / TEK_Exec("measurement:meas2:value?") * 1e-6).toFixed(3);
		var RateErr = ((RateScope - RateSet) / RateSet * 100).toFixed(2);
	
		var CurrentScope = (TEK_Measure(Cal_chMeasureId) / (Cal_Rshunt * 1e-6)).toFixed(2);
		var CurrentErr = ((CurrentScope - CurrentSet) / CurrentSet * 100).toFixed(2);
	}
	Cal_IdSc.push(CurrentScope);
	Cal_IdsetErr.push(CurrentErr);
	Cal_IrateErr.push(RateErr);

	print("Current Set, A = " + CurrentSet);	
	print("Current Osc, A = " + CurrentScope);	
	print("Current Err, % = " + CurrentErr);
	
	print("di/dt Set, A/us = " + RateSet);	
	print("di/dt Osc, A/us = " + RateScope);	
	print("di/dt Err, % = " + RateErr);

	if (Temp_En == 1)
	{
		VDCU = QSU_ReadReg(161,201) / 10;
		p("voltage DCU, V = " + VDCU);

		VRCU = QSU_ReadReg(171,201) / 10;
		p("voltage RCU, V = " + VRCU);

		print("Enter Temp unit DCU");
		TempDCU = readline() / 10;
		print("Enter Temp unit RCU");
		TempRCU = readline() / 10;
		Temp_arrays.push(RateSet + ";" + RateScope + ";" + RateErr + ";" + CurrentSet + ";" + CurrentScope + ";" + CurrentErr + ";" + TempDCU + ";" + TempRCU + ";" + VDCU + ";" + VRCU);
	}
	else
	{	
		Temp_arrays.push(RateSet + ";" + RateScope + ";" + RateErr + ";" + CurrentSet + ";" + CurrentScope + ";" + CurrentErr);
	}
	return RateScope;	
}
//-------------------------------------------------------------------------------------------------------------------------------------------
//Статус всех активных блоков

function QRR_Status()
{
	print("[QSU]")
	QSU_Status();
	PrintStatus();
	print("Fault ex. r.:	" + dev.r(197));
	print("Op. result:	" + dev.r(198));
	print("-------------------------");
	
	print("[CROVU]");
	if (dev.r(0) == 0)
	{	
		QSU_NodeStatus(7, 192);
		print("Fault ex. r.:	" + QSU_ReadReg(7, 199));
	}
	else
		print("Emulation");
	print("-------------------------");
	
	print("[FCROVU]");
	if (dev.r(1) == 0)
	{	
		QSU_NodeStatus(7, 192);
		print("Fault ex. r.:	" + QSU_ReadReg(7, 199));
	}
	else
		print("Emulation");
	print("-------------------------");
	
	print("[DCU1]");
	if (dev.r(2) == 0)
	{	
		QSU_NodeStatus(160, 192);
		print("Fault:		" + QSU_ReadReg(160, 193));
	}
	else
		print("Emulation");
	print("-------------------------");
	
	print("[DCU2]");
	if (dev.r(3) == 0)
	{	
		QSU_NodeStatus(161, 192);
		print("Fault:		" + QSU_ReadReg(161, 193));
	}
	else
		print("Emulation");
	print("-------------------------");
	
	print("[DCU3]");
	if (dev.r(4) == 0)
	{	
		QSU_NodeStatus(162, 192);
		print("Fault:		" + QSU_ReadReg(162, 193));
	}
	else
		print("Emulation");
	print("-------------------------");
	
	print("[RCU1]");
	if (dev.r(5) == 0)
	{	
		QSU_NodeStatus(170, 192);
		print("Fault:		" + QSU_ReadReg(170, 193));
	}
	else
		print("Emulation");
	print("-------------------------");
	
	print("[RCU2]");
	if (dev.r(6) == 0)
	{	
		QSU_NodeStatus(171, 192);
		print("Fault:		" + QSU_ReadReg(171, 193));
	}
	else
		print("Emulation");
	print("-------------------------");
	
	print("[RCU3]");
	if (dev.r(7) == 0)
	{	
		QSU_NodeStatus(172, 192);
		print("Fault:		" + QSU_ReadReg(172, 193));
	}
	else
		print("Emulation");
	print("-------------------------");
	
	print("[HS Sampler]");
	if (dev.r(8) == 0)
	{
		QSU_NodeStatus(0, 192);
		print("Op. result:	" + QSU_ReadReg(0, 197));
	}
	else
		print("Emulation");
	print("-------------------------");	
}

//-------------------------------------------------------------------------------------------------------------------------------------------
//Статус блока QSU

function QSU_Status()
{
	print("Logic state:	" + dev.r(200));
	print("[Interface status]");
	print("Device: 	" + dev.r(201));
	print("Function: 	" + dev.r(202));
	print("Error: 		" + dev.r(203));
	print("ExtData:	" + dev.r(204));
}

//-------------------------------------------------------------------------------------------------------------------------------------------
//!!!!!!!!!!!!!!!!!!!!!

function QRR_Result()
{
	var op_result = dev.r(198);
	print("Result " + ((op_result == 0) ? "NONE" : (op_result == 1) ? "OK" : "FAILED"));
	print("Qrr (GOST), uC: " + (dev.r(210) / 10));
	print("Qrr,        uC: " + (dev.r(216) / 10));
	print("Irr,         A: -" + (dev.r(211) / 10));
	print("trr,        us: " + (dev.r(212) / 10));
	print("tq,         us: " + (dev.r(213) / 10));
	print("Idc,         A: " + dev.r(214));
	print("dIdt,     A/us: " + (dev.r(215) / 10));
	
	plot(dev.rafs(1), 1, 0);
	sleep(200);
	plot(dev.rafs(2), 1, 0);
}

//-------------------------------------------------------------------------------------------------------------------------------------------
//Статус выбранного блока 

function QSU_NodeStatus(Node, BaseReg)
{
	print("Registers [" + BaseReg + " - " + (BaseReg + 4) + "]");
	print("Device state:	" + QSU_ReadReg(Node, BaseReg));
	print("Fault reason:	" + QSU_ReadReg(Node, BaseReg + 1));
	print("Disable reason:	" + QSU_ReadReg(Node, BaseReg + 2));
	print("Warning:	" + QSU_ReadReg(Node, BaseReg + 3));
	print("Problem:	" + QSU_ReadReg(Node, BaseReg + 4));
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// ресурсный тест для RCU временный 

function RCU_Resource(N)
{
	CurrentRateNR = [3, 4, 5, 6, 7, 8, 9, 10];
	for (var j = 0; j < N ; j++)
	{
		for (var i = 0; i < CurrentRateNR.length; i++)
		{
			if (anykey()) return;
			QRR_Start(0, 1100 * UnitEnRCU , CurrentRateNR[i], 100, 10);
		}
	}
}	

function RCU12_Pulse(Current,CurrentRate)
{
	dev.nid(170);
	dev.w(128, Current);
	dev.w(129, CurrentRate);
	dev.c(100);
	dev.nid(171);
	dev.w(128, Current);
	dev.w(129, CurrentRate);
	dev.c(100);
	dev.nid(10);
	sleep(500);
	dev.w(171,500);
	dev.c(23);
}

function QRR_Result()
{
	var op_result = dev.r(198);
	print("Result " + ((op_result == 0) ? "NONE" : (op_result == 1) ? "OK" : "FAILED"));
	print("Qrr (GOST), uC: " + (dev.r(210) / 10));
	print("Qrr,        uC: " + (dev.r(216) / 10));
	print("Irr,         A: -" + (dev.r(211) / 10));
	print("trr,        us: " + (dev.r(212) / 10));
	print("tq,         us: " + (dev.r(213) / 10));
	print("Idc,         A: " + dev.r(214));
	print("dIdt,     A/us: " + (dev.r(215) / 10));
	
	plot(dev.rafs(1), 1, 0);
	sleep(200);
	plot(dev.rafs(2), 1, 0);
}

function M_QRR_Start(CurrentSet,RateSet)
{	
//TEK_Send("ch" + Cal_chMeasureId + ":position 0");
//DRCU_TekScaleId(Cal_chMeasureId, CurrentSet * (UnitEnRCU + UnitEnDCU) * Cal_Rshunt * 1e-6 );
//TEK_Send("horizontal:main:position "+ 0.1 * 1e-6);
//TEK_Send("horizontal:scale "  + ((CurrentSet * (UnitEnDCU + UnitEnRCU) / CurrentRate[RateSet]) * 1e-6) * 0.3 / (UnitEnDCU + UnitEnRCU));
//sleep(200);
QRR_Start(0, CurrentSet * UnitEnRCU, CurrentRateN[RateSet], 100, 10);
sleep(500);
var M_RateScope = ((TEK_Measure(Cal_chMeasureId) - TEK_Measure(3))  * 0.8 / Cal_Rshunt * 1e6 / TEK_Exec("measurement:meas2:value?") * 1e-6).toFixed(3);
var M_RateErr = ((M_RateScope - CurrentRateALL[RateSet])  / CurrentRateALL[RateSet]  * 100).toFixed(2);
var M_CurrentScopeP = ((TEK_Measure(Cal_chMeasureId)) / (Cal_Rshunt * 1e-6)).toFixed(2);
var M_CurrentScopeN = ( TEK_Measure(3) / (Cal_Rshunt * 1e-6)).toFixed(2);
print("Current Positive Osc, A = " + M_CurrentScopeP);
print("Current Negative Osc, A = " + M_CurrentScopeN);	
print("di/dt Set, A/us = " + CurrentRateALL[RateSet]/6*(UnitEnDCU + UnitEnRCU));	
print("di/dt Osc, A/us = " + M_RateScope);	
print("di/dt Err, % = " + M_RateErr);
}
//
function P(Value)
{
QRR_Start(0,Value,4,100,10);
sleep(1000);
QRR_Start(0,Value,4,100,10);
sleep(1000);
QRR_Start(0,Value,4,100,10);
sleep(1000);
QRR_Start(0,Value,4,100,10);
sleep(1000);
QRR_Start(0,Value,4,100,10);
sleep(1000);
}

function StartPress()
{
QSU_Call(1, 1);
QSU_Call(1, 100);
QSU_Call(6, 100);
QSU_WriteReg(6, 70, 50);
QSU_WriteReg(6, 71, 0);
QSU_Call(6, 102);
}

