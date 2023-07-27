include("Tektronix.js");
include("TestQRR.js")
include("CalGeneral.js")

//Константы
TEK = 0;
PICO = 1;
//

//Переменные
var Verify = 0;
var Osc = TEK;
//

CurrentRateTest = 0.5; // 0.5, 0.75, 1, 2.5, 5, 7.5, 10, 15, 25, 30, 50 A/us
cal_Iterations = 1;
cal_UseAvg = 0;

// Counters
//cal_CntTotal = 0;
//cal_CntDone = 0;

// Channels
cal_chMeasureId = 1;
cal_chSync = 3;

// Results storage
cal_Id = [];
cal_Idset = [];
cal_Irate = [];
cal_VintPS = [];

// Tektronix data
cal_IdSc = [];
cal_IdSc = [];
cal_Irate = [];

// Relative error
cal_IdErr = [];
cal_IdsetErr = [];
cal_Irate = [];

//----------------------------------------------------------------------------------
function QPU_Cal_Idc_Verify(LSL_Port, TekPort)
{
	Verify = 1;
	
	QPU_Cal_Idc(LSL_Port, TekPort);
	
	Verify = 0;
}
//----------------------------------------------------------------------------------

//----------------------------------------------------------------------------------
function QPU_Cal_Idc(QPU_Port,TekPort)
{	
	//Константы
	QPU_NID				= 0;			//Nid блока QPU
	N    				= 10;			//Количество точек калибровки
	QPU_CURRENT_MIN		= 100;			//Минимальный ток блока QPU
	QPU_CURRENT_MAX		= 500;			//Максимальный ток блока QPU
	R_SHUNT				= 1.00;			//Шунт для измерения тока
	
	
	//Переменные
	var TEK_Idc = 0;
	var Current = 0;
	var dI = 0;
	var Imin = 0;
	var PICO_Idc = 0;
	var Cal_Data = [];
	var I_error = [];
	var I_Osc = [];
	//
	
	dev.nid(QPU_NID);
	dev.Connect(QPU_Port);
	
	//Определение шага измениния тока
	dI = parseFloat((QPU_CURRENT_MAX-QPU_CURRENT_MIN)/(N-1)).toFixed(0);
	//

	if(Osc == TEK)
	{
		QPU_TekInit(TekPort);
		QPU_TekCursor(1);
	}
	
	
	//Сброс калибровочных коэфф до калибровки
	if(Verify==0)
	{
		dev.w(22,0);
		dev.w(23,1000);
		dev.w(24,0);
	}
	//
	

	for(i=0;i<N;i++)
	{	
		//Вчисление тока
		Current = parseInt(dI*i+QPU_CURRENT_MIN);
		
		if(Current>QPU_CURRENT_MAX)
			Current=QPU_CURRENT_MAX;
		//
		
		//Смена вертикальный шкалы осциллографа
		if(Osc == TEK)
		{
			QPU_TekRangeChange(Current);
		}
		//
		
	
		//Формируем импульс
		print("# " + (i + 1));
		
		QPU_Start(Current);
		sleep(10000);
		//
		
		
		//Измеряем остальные параметры
		if(Osc == PICO)
		{
			//Ожидание ввода значений с осциллографа PicoScope
			print("Enter force value (in mV):");
			PICO_Idc = Math.round(readline());
			print("----------------------------------");
			
			if (isNaN(PICO_Utm))
				break;
			
			//Вычисление погрешности
			I_error[i] = (Current-PICO_Idc)*100/Current;
			I_Osc[i] = PICO_Idc;
			
			//Сохраняем данные в файл
			Cal_Data[i]=(Current+";"+PICO_Idc);
		}
		else
		{
			//Считывание измеренное значение с осциллографа Tektronix
			TEK_Idc = parseFloat(TEK_Exec("cursor:vbars:hpos1?")*1000);
			
			//Вычисление погрешности
			I_error[i] = (Current-TEK_Idc)*100/Current;
			I_Osc[i] = TEK_Idc;
			
			//Сохраняем данные в файл
			Cal_Data[i]=(Current+";"+TEK_Idc);
		}
		
		save("data/qpu_cal_idc.csv",Cal_Data);
		//
	}
	
	//Вывод на экран погрешности измерения
	scattern(I_Osc, I_error, "Current (in A)", "Error (in %)", "Current relative error");
	//
	
	if(Verify==0)
	{
		//Вычисление корректировки
		I_corr = CGEN_GetCorrection2("qpu_cal_idc");
		
		//Сохранение калибровочных коэффициентов в память QPU
		dev.w(22,Math.round(I_corr[0]*1000000));
		dev.w(23,Math.round(I_corr[1]*1000));
		dev.w(24,Math.round(I_corr[2]));
		dev.c(200);
	}
}

//----------------------------------------------------------------------------------

function QRR_CAL_Init(portDevice, portTek, channelMeasureId)
{
	/*if (cal_UseQRR == 1)
	{
		QRR_CANCal(cal_QRRCanPort,cal_QRRCanNID,DRCU_Active, DRCU_Present);
		dev.Disconnect();
	}*/
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

//----------------------------------------------------------------------------------

function CAL_QRR_VerifyIrate()
{		
	CAL_ResetA();
	
	// Tektronix init
	QRR_CAL_TekInitIrate();

	// Reload values
	var CurrentArray = CGEN_GetRange(cal_IdMin, cal_IdMax, cal_IdStp);

	if (QRR_CAL_CollectIrate(CurrentArray, cal_Iterations))
	{
		CAL_SaveVintPS("QRR_Irate_fixed");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IrateErr, "Current (in A)", "Error (in %)", "Current rate relative error " + CurrentRateTest + "A/us");
	}
}

//----------------------------------------------------------------------------------

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
}

//----------------------------------------------------------------------------------

function QRR_QRR_CollectIrate(CurrentValues, IterationsCount)
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
			
			DCU_TekScaleId(cal_chMeasureId, CurrentValues[j] * cal_Rshunt / 1000000 * 2);
			TEK_Send("horizontal:scale "  + ((CurrentValues[j]/CurrentRateTest)/1000000)*0.5);
			//p((((CurrentValues[j]/CurrentRateTest)/1000000)));

			TEK_Send("horizontal:main:position "+ (((CurrentValues[j]/CurrentRateTest)/1000000)*0.1));
			sleep(1000);
			
			for (var k = 0; k < AvgNum; k++)
			{	//QRR_Start(Mode, IDC, IDCFallRate, OSV, OSVRate)
				p(CurrentValues[j], CurrentRateTest * 100);
				if(!(QRR_Start(0, CurrentValues[j], CurrentRateTest * 100, 100, 10)))
					return 0;
				/*if(!DRCU_Pulse(CurrentValues[j], CurrentRateTest * 100))
					return 0;*/
				sleep (1000);
			}

			// Scope data
			var IdSc = (CAL_MeasureId(cal_chMeasureId) / cal_Rshunt * 1000).toFixed(2);
			cal_IdSc.push(IdSc);
			print("Idtek, A: " + IdSc);
			
			var IrateSc = CAL_MeasureIrate();
			cal_IrateSc.push(IrateSc);
			print("Irate tek, A/us: " + IrateSc);

			// Relative error
			var IrateErr = ((IrateSc - CurrentRateTest) / CurrentRateTest * 100).toFixed(2);
			cal_IrateErr.push(IrateErr);
			print("Irate err, %: " + IrateErr);
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

//----------------------------------------------------------------------------------

function QRR_CAL_MeasureId(Channel)
{
	return (TEK_Exec("measurement:meas1:value?") * 1000).toFixed(1);
}
//--------------------

function QRR_CAL_MeasureIrate()
{
	return ((TEK_Measure(1) * 0.8 / cal_Rshunt * 1e6 / TEK_Exec("measurement:meas2:value?") * 1e-6).toFixed(3));
}

//----------------------------------------------------------------------------------

function QRR_CAL_TekInitIrate()
{
	TEK_ChannelInit(cal_chMeasureId, "1", "0.02");
	TEK_TriggerInit(cal_chMeasureId, "0.5");
	TEK_Send("ch" + cal_chMeasureId + ":position 0");
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


//----------------------------------------------------------------------------------
function QPU_TekRangeChange(Current)
{
	R_SHUNT	= 1.00;
	
	//Смена вертикальный шкалы осциллографа
	Tek_Vmax = Current*R_SHUNT/1000;
	Tek_V_Range = Tek_Vmax/7;
	
	if(Tek_V_Range<=0.002){QPU_TEK_ChannelInit(1, 1, 0.002);}
	if((Tek_V_Range>0.002)&&(Tek_V_Range<=0.005)){QPU_TEK_ChannelInit(1, 1, 0.005);}
	if((Tek_V_Range>0.005)&&(Tek_V_Range<=0.01)){QPU_TEK_ChannelInit(1, 1, 0.01);}
	if((Tek_V_Range>0.01)&&(Tek_V_Range<=0.02)){QPU_TEK_ChannelInit(1, 1, 0.02);}
	if((Tek_V_Range>0.02)&&(Tek_V_Range<=0.05)){QPU_TEK_ChannelInit(1, 1, 0.05);}
	if((Tek_V_Range>0.05)&&(Tek_V_Range<=0.1)){QPU_TEK_ChannelInit(1, 1, 0.1);}
	if((Tek_V_Range>0.1)&&(Tek_V_Range<=0.2)){QPU_TEK_ChannelInit(1, 1, 0.2);}
	if((Tek_V_Range>0.2)&&(Tek_V_Range<=0.5)){QPU_TEK_ChannelInit(1, 1, 0.5);}
	if((Tek_V_Range>0.5)&&(Tek_V_Range<=1)){QPU_TEK_ChannelInit(1, 1, 1);}
	if((Tek_V_Range>1)&&(Tek_V_Range<=2)){QPU_TEK_ChannelInit(1, 1, 2);}
	if((Tek_V_Range>2)&&(Tek_V_Range<=5)){QPU_TEK_ChannelInit(1, 1, 5);}
	if(Tek_V_Range>5){QPU_TEK_ChannelInit(1, 1, 5);}
	
	sleep(1000);
	//
}
//----------------------------------------------------------------------------------

//----------------------------------------------------------------------------------
function QPU_TEK_ChannelInit(Channel, Probe, Scale)
{
	TEK_Send("ch" + Channel + ":bandwidth on");
	TEK_Send("ch" + Channel + ":coupling dc");
	TEK_Send("ch" + Channel + ":invert on");
	TEK_Send("ch" + Channel + ":position -3");
	TEK_Send("ch" + Channel + ":probe " + Probe);
	TEK_Send("ch" + Channel + ":scale " + Scale);
}
//----------------------------------------------------------------------------------

//----------------------------------------------------------------------------------
function QPU_TekInit(Port)
{
	//Tektronix config
	TEK_PortInit(Port);
	QPU_TEK_ChannelInit(1, 1, 0.02);//(channel,probe,scale) I dut
	TEK_TriggerInit(1, -0.06);//(channel,level) sync
	TEK_Horizontal(100e-6, -0.01);//(scale,position)
}
//----------------------------------------------------------------------------------


//----------------------------------------------------------------------------------
function QPU_TekCursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send("cursor:vbars:position1 -500e-6");
}
//----------------------------------------------------------------------------------