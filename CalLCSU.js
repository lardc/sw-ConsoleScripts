include("CalGeneral.js")
include("DMM6500.js")
include("TestLCSU.js")
include("Tektronix.js")

PulseType = 2; // 0 - синус, 1 - модифицированный синус, 2 - трапеция

// Calibration setup parameters

// Обозначение диапазонов калибровки
clcsu_CurrentRange = 0; // 0 = диапазон [ <= 350 A]; 1 = диапазон [ < 1100 A]; 2 = диапазон [ < 6500 A]
var LCSU_Range = new Array(6); // массив номеров регистров К и B для разных диапазонов (0,1), задержек между формированиями импульсов для разных диапазонов (2), кол-ва задействованных плат (3)
CLCSU_Range(clcsu_CurrentRange); 
var CLCSU_K_start = dev.rf(LCSU_Range[0]);
var CLCSU_B_start = dev.rf(LCSU_Range[1]);
//dev.wf(LCSU_Range[0], CLCSU_K_start);
//dev.wf(LCSU_Range[1], CLCSU_B_start);

//
clcsu_Points = 5; // кол-во точек калибровки (токов) внутри диапазона калибровки
//

	clcsu_IdMin = [70, 351, 1101]; 
	clcsu_IdMax = [350, 1100, 6500]; 	


clcsu_IdStp = (clcsu_IdMax[clcsu_CurrentRange] - clcsu_IdMin[clcsu_CurrentRange]) / clcsu_Points;
//
clcsu_Iterations = 5; // количество итераций накопления статистики
clcsu_SaveImage = 0;

var CurrentArray = CGEN_GetRangeLogarithm(clcsu_IdMin[clcsu_CurrentRange], clcsu_IdMax[clcsu_CurrentRange], clcsu_Points);


var CurrentValues = new Array(clcsu_CntTotal); // массив значений измеренных 6500 токов
var UnitValues = new Array(clcsu_CntTotal); // массив значений измеренных LCSU CtrlBrd токов
var DACValues = new Array(clcsu_CntTotal); // массив значений ЦАП
var ErrSetCurrents = new Array(clcsu_CntTotal); // массив отклонений измеренных 6500 значений относительно заданных
var ErrMeasCurrents = new Array(clcsu_CntTotal); // массив отклонений измеренных блоком значений относительно 6500
var CurrentArray_repeat = new Array(clcsu_CntTotal); // массив задаваемых токов, повторяемый clcsu_Iterations раз, используется для вывода графика погрешности

var sum_Current_square = 0, sum_Current  = 0, sum_DAC = 0, sum_Common = 0; // коэффициенты для расчета аппроксимационной прямой
var index = 0; 
var CurrentCheckCorrect = false; // переменная для цикла проверки корректности полученного от 6500 значения тока
var CurrentTemp = 0;

var clcsu_CntTotal = clcsu_Iterations * CurrentArray.length;
	var RegulatorError = 0;

function VarZero(CurrentValues, UnitValues, DACValues, ErrSetCurrents, ErrMeasCurrents, CurrentArray_repeat, sum_Current_square, sum_Current, sum_DAC, sum_Common, index, CurrentCheckCorrect, CurrentTemp)
{
	for (var i = 0; i<clcsu_CntTotal; i++)
	{
		CurrentValues[i]=0;
		UnitValues[i]=0;
		DACValues[i]=0;
		ErrSetCurrents[i]=0;
		ErrMeasCurrents[i]=0;
		CurrentArray_repeat[i]=0;
	}
	sum_Current_square = 0;
	sum_Current = 0;
	sum_DAC = 0;
	sum_Common = 0;
	index = 0;
	CurrentCheckCorrect = false;
	CurrentTemp = 0;
}


function CLCSU_CollectId6500(CurrentArray, clcsu_Iterations, PulseType)
{
	VarZero(CurrentValues, UnitValues, DACValues, ErrSetCurrents, CurrentArray_repeat, sum_Current_square, sum_Current, sum_DAC, sum_Common, index, CurrentCheckCorrect, CurrentTemp)
	//clcsu_CntDone = 1;
	print("Total measurements: " + clcsu_CntTotal);
	print("--------------------");

	for (var i = 0; i < clcsu_Iterations; i++)
	{
		print("First cycle");
		for (var j = 0; j < CurrentArray.length; j++)
		{
			print("Second cycle");
			while(CurrentCheckCorrect === false)
			{
				KEI_Wait();
				sleep(3000);
				LCSU_Start(PulseType, CurrentArray[j]);
				sleep(LCSU_Range[2]);


				CurrentTemp = KEI_ReadArrayTrapeze();


				if (CurrentTemp > 5)
				{
					CurrentCheckCorrect = true;
				}
				else
				{
					print("IdSc, A: " + CurrentTemp);
					print("Incorrect measurement. Repeat...");
					print("--------------------");
								if (anykey()) return 0;
				}
				if (anykey()) return 0;
			}

				RegulatorError = dev.rf(196);
				if (RegulatorError==1)
				{
					p("Following regulator error.")
					dev.c(2);
					sleep(100);
					dev.c(1);
					return 0;
				}
		

				CurrentCheckCorrect = false;
				Id_DACArray = dev.raff(6);
				var IdDAC = Math.max.apply(null, Id_DACArray);

				var IdUnit = dev.rf(200); // Ток измеренный LCSU CtrlBrd
				var IdSc = CurrentTemp; // Ток измеренный DMM6500, он же realCurrent в старом скрипте
				var IdSet = dev.rf(128); // Задаваемый ток, он же Current_actual в старом скрипте
				var IdErrSet = ((IdSc - IdSet) / IdSet * 100); // погрешность измеренного 6500 тока относительно заданного

				var IdErrMeas = ((IdUnit - IdSc) / IdSc * 100); // погрешность измеренного блоком тока относительно измеренного 6500 
				//clcsu_Id.push(IdSet);
				//clcsu_IdSc.push(IdSc);
				//clcsu_IdErr.push(IdErr);
				sum_Current_square += (IdSc * IdSc);
				sum_Current += IdSc;
				sum_DAC += IdDAC;
				sum_Common += IdSc * IdDAC;
				index = (i * (clcsu_Iterations)) + j;
				//print("Index: " + index + "; i: " + i + "; j: " + j);

				CurrentValues[index] = IdSc;
				UnitValues[index] = IdUnit;
				DACValues[index] = IdDAC;
				ErrSetCurrents[index] = +IdErrSet;
				ErrMeasCurrents[index] = +IdErrMeas;
				CurrentArray_repeat[index] = +CurrentArray[j].toFixed(2);

				//print("DAC: " + IdDAC);
				print("IdSet, A: " + IdSet);
				print("IdSc, A: " + IdSc);
				//print("IdUnit, A: " + IdUnit);
				print("IdErrSet, %: " + IdErrSet);
				print("IdMeasSet, %: " + IdErrMeas);
				print("--------------------");
		}
	}

	scattern(CurrentArray_repeat, ErrSetCurrents, "IdSet, A", "IdErrSet, %", "Set error");
	scattern(CurrentArray_repeat, ErrMeasCurrents, "IdSet, A", "IdErrMeas, %", "Measure error");

	return CurrentArray_repeat, UnitValues, CurrentValues, sum_Current_square, sum_Current, sum_DAC, sum_Common;
}
//function CLCSU_FineCalibrateADC(UnitValues, CurrentValues,RegSwitch) // RegSwitch - вкл или выкл сброс регистров, 1 - вкл, 0 - выкл

function CLCSU_FineCalibrateADC(UnitValues, CurrentValues, CurrentArray_repeat, RegSwitch) // RegSwitch - вкл или выкл сброс регистров, 1 - вкл, 0 - выкл
{
	switch(RegSwitch)
	{
		case 1:
			{
				dev.wf(LCSU_Range[6],0);
				dev.wf(LCSU_Range[5],1);
				dev.wf(LCSU_Range[4],0);
			}	
	}

	CLCSU_CollectId6500(CurrentArray, clcsu_Iterations, PulseType);
	var QuadraticCoeffs = CGEN_GetNumericCorrection2(UnitValues, CurrentArray_repeat);

	print("y = Ax^2 + Bx + C");
	print("Coefficient A: " + QuadraticCoeffs[2]);
	print("Coefficient B: " + QuadraticCoeffs[1]);
	print("Coefficient C: " + QuadraticCoeffs[0]);

	 dev.wf(LCSU_Range[6],QuadraticCoeffs[0]);
	 dev.wf(LCSU_Range[5],QuadraticCoeffs[1]);
	 dev.wf(LCSU_Range[4],QuadraticCoeffs[2]);
}

function CLCSU_CalibrateDAC()
{
	CLCSU_CollectId6500(CurrentArray, clcsu_Iterations, PulseType);

	print("sum_Current_square: " + sum_Current_square);
	print("sum_Current: " + sum_Current);
	print("sum_DAC: " + sum_DAC);
	print("sum_Common: " + sum_Common);
	print("clcsu_CntTotal: " + clcsu_CntTotal);

	var coeff_n1 = sum_Current_square * sum_DAC/sum_Current;
	var coeff_b1 = sum_Current_square * (-(clcsu_CntTotal)) / sum_Current;
	var coeff_b2 = coeff_b1 + sum_Current;
	var coeff_n2 = sum_Common - coeff_n1;
	var CLCSU_B = (coeff_n2 / coeff_b2);
	var CLCSU_K = LCSU_Range[3] * ((sum_DAC - (clcsu_CntTotal * CLCSU_B)) / sum_Current);
	p("Coeff K: " + CLCSU_K);
	p("Coeff B: " + CLCSU_B);
	sum_Current_square = 0, sum_Current  = 0, sum_DAC = 0, sum_Common = 0;

	if (CLCSU_K < 0.01 || CLCSU_K > 250 || CLCSU_B<500 || CLCSU_B>2000)
		{
			p("Wrong values! Write previous coefficients.");
			dev.wf(LCSU_Range[0], CLCSU_K_start);
			dev.wf(LCSU_Range[1], CLCSU_B_start);	
		}
		else 
		{
			p("Good values! Remember about saving data in ROM by dev.c(200) directive.");
			CLCSU_K_start = CLCSU_K;
			CLCSU_B_start = CLCSU_B;
			dev.wf(LCSU_Range[0], CLCSU_K);
			dev.wf(LCSU_Range[1], CLCSU_B);	
		}
}

function CLCSU_VerifyId6500()
{
	//CLCSU_CollectId6500(CurrentArray, clcsu_Iterations, PulseType);
	scattern(CurrentArray_repeat, deltaCurrents, "IdSet, A", "IdErrSet, %", "Set deviation");
}

function CLCSU_Range(clcsu_CurrentRange) // Функция для определения номера регистров записи коэффициентов
{
	switch(clcsu_CurrentRange)
	{
		case 0:
			{
				LCSU_Range[0] = 23; // номера регистров
				LCSU_Range[1] = 24;
				LCSU_Range[2] = 500; // задержка в мс
				LCSU_Range[3] = 1; // кол-во задействованных плат
				// y = Ax^2+Bx+C
				LCSU_Range[4] = 34; // тонкая подстройка АЦП, квадратичный к-нт A
				LCSU_Range[5] = 35; // тонкая подстройка АЦП, линейный к-нт B
				LCSU_Range[6] = 36; // тонкая подстройка АЦП, масштабный к-нт C
				break;
			}
		case 1:
			{
				LCSU_Range[0] = 28;
				LCSU_Range[1] = 29;
				LCSU_Range[2] = 2000; // задержка в мс
				LCSU_Range[3] = 6; // кол-во задействованных плат
				LCSU_Range[4] = 39;
				LCSU_Range[5] = 40;
				LCSU_Range[6] = 41;
				break;
			}
		case 2:
			{
				LCSU_Range[0] = 67;
				LCSU_Range[1] = 68;
				LCSU_Range[2] = 15000; // задержка в мс
				LCSU_Range[3] = 6; // кол-во задействованных плат
				LCSU_Range[4] = 39;
				LCSU_Range[5] = 40;
				LCSU_Range[6] = 41;
				break;
			}
		default:
		{
				p("Incorrect value. 0 = 70...350 A, 1 = 350...1100 A, 2 = 1100...6500 A. Please rewrite number of range in clcsu_CurrentRange var.");
				break;
		}
	}
}

function CLCSU_Regulator(Range, OnOff) // диапазон 0,1,2; вкл (1), выкл (0)
{
	switch(OnOff)
	{
		case 0:
		{
			CLCSU_RegulatorSave(Range);
			dev.wf(53,1);
			p("Regulator off. Range: " +Range);
			break;
		}
		case 1:
		{
			CLCSU_RegulatorCall(Range);
			dev.wf(53,0);
			p("Regulator on. Range: " +Range);
			break;
		}
		default:
		{
			p("Incorrect value");
			break;
		}
	}
}

var RegulatorProp = 0;
var RegulatorIntegral = 0;

function CLCSU_RegulatorSave(Range)
{
	switch(Range)
	{
		case 0:
			{
				RegulatorProp = dev.rf(44);
				RegulatorIntegral = dev.rf(45);
				dev.wf(44,0);
				dev.wf(45,0);
				break;
			}
		case 1:
			{
				RegulatorProp = dev.rf(46);
				RegulatorIntegral = dev.rf(47);
				dev.wf(45,0);
				dev.wf(46,0);
				break;
			}
		case 2:
			{
				RegulatorProp = dev.rf(70);
				RegulatorIntegral = dev.rf(71);
				dev.wf(70,0);
				dev.wf(71,0);
				break;
			}
			default:
			{
				p("Incorrect value");
				break;
			}
	}
}
function CLCSU_RegulatorCall(Range)
{
	switch(Range)
	{
		case 0:
			{
				dev.wf(44,RegulatorProp);
				dev.wf(45,RegulatorIntegral);
				break;
			}
		case 1:
			{
				dev.wf(46,RegulatorProp);
				dev.wf(47,RegulatorIntegral);
				break;
			}
		case 2:
			{
				dev.wf(70,RegulatorProp);
				dev.wf(71,RegulatorIntegral);
				break;
			}
			default:
			{
				p("Incorrect value");
				break;
			}
	}
}

function CLCSU_TrapezeLevel()
{
	var Trapeze = KEI_ReadArray();
	var StartNumber = 0;
	var EndNumber = 0;
	var TrapezeLevel = 0;

	for (var i = 0; i<Trapeze.length; i++)
		{
				p(Trapeze[i]);
		}

	for (var i = 0; i<Trapeze.length; i++)
	{
		if (Trapeze[i]>0.015)
		{
			StartNumber = i+(Math.ceil(Trapeze.length*0.1));
			break;
		}
	}
	for (var i = StartNumber; i<Trapeze.length; i++)
	{
		if (Trapeze[i]<0.015)
		{
			EndNumber = i-(Math.ceil(Trapeze.length*0.1));
			break;
		}
	}
	p("StartNumber: " + StartNumber);
	p("EndNumber: " + EndNumber);

	for (var c = StartNumber; c<=EndNumber; c++)
	{
		TrapezeLevel = TrapezeLevel + Trapeze[c];
	}
	TrapezeLevel = (TrapezeLevel/(EndNumber-StartNumber+1))/Shunt;
	p("TrapezeLevel: " + TrapezeLevel);

	return TrapezeLevel;
}


///--- Функции для осциллографа Tektronix и иных прочих ---///

function CAL_Init(portDevice, portTek, channelMeasureId)
{
	if (channelMeasureId < 1 || channelMeasureId > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	cal_chMeasureId = channelMeasureId;

	// Init device port
	dev.Disconnect();
	dev.Connect(portDevice);

	// Init Tektronix port
	TEK_PortInit(portTek);
	
	// Tektronix init
	for (var i = 1; i <= 4; i++)
	{
		if (i == channelMeasureId)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
}
//--------------------

function CAL_VerifyId()
{		
	CAL_ResetA();
	
	// Tektronix init
	CAL_TekInit();

	// Reload values
	var CurrentArray = CGEN_GetRange(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_IdStp);

	if (CAL_CollectId(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("LCSU_Id_fixed");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErr, "Current (in A)", "Error (in %)", "Current setpoint relative error");
	}
}
//--------------------
function CAL_CalibrateId()
{		
	CAL_ResetA();
	CAL_ResetIdCal();
	
	// Tektronix init
	CAL_TekInit(cal_chMeasureId);

	// Reload values
	var cal_IdStp = Math.round((cal_IdMax[cal_CurrentRange] - cal_IdMin[cal_CurrentRange]) / (cal_Points - 1));
	var CurrentArray = CGEN_GetRange(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_IdStp);

	if (CAL_CollectId(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("LSLPC_Id");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErr, "Current (in A)", "Error (in %)", "Current setpoint relative error");

		// Calculate correction
		cal_IdCorr = CGEN_GetCorrection2("LSLPC_Id");
		CAL_SetCoefId(cal_IdCorr[0], cal_IdCorr[1], cal_IdCorr[2]);
		CAL_PrintCoefId();
	}
}
//-------------------------

function CAL_ResetA()
{	
	// Results storage
	cal_Id = [];

	// Tektronix data
	cal_IdSc = [];

	// Relative error
	cal_IdErr = [];

	// Correction
	cal_IdCorr = [];
}
//--------------------
function CAL_TekInit()
{
	TEK_ChannelInit(cal_chMeasureId, "1", "0.01");
	TEK_TriggerPulseInit(cal_chMeasureId, "0.04");
	TEK_Horizontal("0.250e-3", "0");
	TEK_Send("measurement:meas" + cal_chMeasureId + ":source ch" + cal_chMeasureId);
	TEK_Send("measurement:meas" + cal_chMeasureId + ":type maximum");
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
		TEK_AcquireAvg(AvgNum);p
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
			LCSU_TekScale(cal_chMeasureId, CurrentValues[j] * cal_Rshunt / 1000000);
			
			for (var k = 0; k < AvgNum; k++)
			{
				if(!LCSU_Start(CurrentValues[j]))
					return false;
			}
			
			// Unit data
			var IdSet = dev.r(128);
			cal_Id.push(IdSet);
			print("Idset, A: " + IdSet);

			// Scope data
			var IdSc = (CAL_Measure(cal_chMeasureId) / cal_Rshunt * 1000000).toFixed(2);
			cal_IdSc.push(IdSc);
			print("Idtek, A: " + IdSc);

			// Relative error
			var IdErr = ((IdSet - IdSc) / IdSc * 100).toFixed(2);
			cal_IdErr.push(IdErr);
			print("IdSetErr, %: " + IdErr);
			print("--------------------");


			
			if (anykey()) return 0;
		}
	}

	return 1;
}
//--------------------
function LCSU_TekScale(Channel, Value)
{
	Value = Value / 6;
	TEK_Send("ch" + Channel + ":scale " + Value);
	
	TEK_TriggerPulseInit(cal_chMeasureId, Value * 1);
}
//--------------------

function CAL_Measure(Channel)
{
	return TEK_Measure(Channel);
}
//--------------------

function CAL_SaveId(NameId)
{
	CGEN_SaveArrays(NameId, cal_Id, cal_IdSc, cal_IdErr);
}
//--------------------

function CAL_CollectMesure(CurrentValues, IterationsCount)
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
			LCSU_TekScale(cal_chMeasureId, CurrentValues[j] * cal_Rshunt / 1000000);
			
			for (var k = 0; k < AvgNum; k++)
			{
				if(!LCSU_Start(CurrentValues[j]))
					return false;
			}
			
			// Unit data
			var IdSet = dev.rf(128);
			cal_Id.push(IdSet);
			print("Idset, A: " + IdSet);

			// Unit data
			var IdMes = dev.rf(200);
			cal_IdMes.push(IdMes);
			print("IdMes, A: " + IdMes);

			// Scope data
			var IdSc = (CAL_Measure(cal_chMeasureId) / cal_Rshunt * 1000000).toFixed(3);
			cal_IdSc.push(IdSc);
			print("Idtek, A: " + IdSc);

			// Relative error
			var IdErr = ((IdSet - IdSc) / IdSc * 100).toFixed(2);
			cal_IdErr.push(IdErr);
			print("IdSetErr, %: " + IdErr);

			var IdErrMes = ((IdMes - IdSc) / IdSc * 100).toFixed(2);
			cal_IdErrMes.push(IdErrMes);
			print("IdMesErr, %: " + IdErrMes);
			print("--------------------");


			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CAL_VerifyMesure()
{		
	CAL_ResetA();
	
	// Tektronix init
	CAL_TekInit();

	// Reload values
	var CurrentArray = CGEN_GetRange(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_IdStp);

	if (CAL_CollectMesure(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("LCSU_Id_fixed");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErrMes, "Current (in A)", "Error (in %)", "Current setpoint relative error");
	}
}
//--------------------
function CAL_CalibrateMesure()
{		
	CAL_ResetA();
	CAL_ResetIdCalMes()
	// Tektronix init
	CAL_TekInit();

	// Reload values
	var CurrentArray = CGEN_GetRange(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_IdStp);

	if (CAL_CollectMesure(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("LCSU_Id_fixed");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErr, "Current (in A)", "Error (in %)", "Current setpoint relative error");

		cal_IdCorr = CGEN_GetCorrection2("LCSU_Id_fixed");
		CAL_SetCoefIdMes(cal_IdCorr[0], cal_IdCorr[1], cal_IdCorr[2]);
		CAL_PrintCoefIdMes();
	}
}
//--------------------

function CAL_ResetIdCal()
{
	CAL_SetCoefId(0, 1, 0);
}
//--------------------
function CAL_SetCoefId(P2, P1, P0)
{
	switch(cal_CurrentRange)
	{	
		case 0:
		{
			dev.wf(20, P2);
			dev.wf(21, P1);
			dev.wf(22, P0);
		}
		break;
		
		case 1:
		{
			dev.wf(25, P2);
			dev.wf(26, P1);
			dev.wf(27, P0);
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
			print("Id 0 P2	: " + dev.rf(20));
			print("Id 0 P1	: " + dev.rf(21));
			print("Id 0 P0	: " + dev.rf(22));
		}
		break;
		
		case 1:
		{
			print("Id 1 P2	: " + dev.rf(25));
			print("Id 1 P1	: " + dev.rf(26));
			print("Id 1 P0	: " + dev.rf(27));
		}
		break
	}
}
//--------------------
function CAL_SetCoefIdMes(P2, P1, P0)
{
	switch(cal_CurrentRange)
	{	
		case 0:
		{
			dev.wf(34, P2);
			dev.wf(35, P1);
			dev.wf(36, P0);
		}
		break;
		
		case 1:
		{
			dev.wf(39, P2);
			dev.wf(40, P1);
			dev.wf(41, P0);
		}
		break;
	}		
}
//--------------------

function CAL_ResetIdCalMes()
{
	CAL_SetCoefIdMes(0, 1, 0);
}
//--------------------
function CAL_PrintCoefIdMes()
{
	switch(cal_CurrentRange)
	{
		case 0:
		{
			print("Id 0 P2	: " + dev.rf(34));
			print("Id 0 P1	: " + dev.rf(35));
			print("Id 0 P0	: " + dev.rf(36));
		}
		break;
		
		case 1:
		{
			print("Id 1 P2	: " + dev.rf(39));
			print("Id 1 P1	: " + dev.rf(40));
			print("Id 1 P0	: " + dev.rf(41));
		}
		break
	}
}